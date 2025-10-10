import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import { ApiResponse } from "../utils/ApiResponse.js" 
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import jwt from "jsonwebtoken"
import mongoose from "mongoose";

const generateAccessAndRefreshTokens= async(userId) => {
    try {
        const user= await User.findById(userId)  //find user based on userId
        const accessToken= user.generateAccessToken()  //generate access token
        const refreshToken= user.generateRefreshToken()  //generate refresh token
        user.refreshToken= refreshToken  //access token is given to user and refresh token is saved in database
        user.save({validateBeforeSave: false})  //save refresh token in database  //no validation required before save
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

const registerUser= asyncHandler(async(req, res) => {
    //get user details from frontend
    const { fullname, username, email, password} = req.body
    //console.log("email: ", email)
    
    //validation: if any field is empty
    if(
        [fullname, username, email, password].some((field) =>   //returns true if one or more elements of array is empty 
        field?.trim()==="")    
    ){
        throw new ApiError(400, "All fields are required")
    }
    //this can also be done by checking all fields individually

    //check if user already exists
    const existedUser= await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    //upload images and avatars and check for avatar
    const avatarLocalPath= req.files?.avatar[0]?.path   //local path since it is on our server but not on cloudinary yet
    // ? means optional

    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    //upload images and avatars to cloudinary and check again for avatar
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)
    //check avatar since it is a required field
    if(!avatar){
        throw new ApiError(400, "Avatar file is required")
    }

    //create user object and create db entry
    const user= await User.create({
        fullname,
        avatar: avatar.url,
        coverImage: coverImage?.url || "",  //this means that if cover image is there then take the url else leave it empty
        email, 
        password,
        username: username.toLowerCase()
    })

    //remove password and refresh token field from response 
    const createdUser= await User.findById(user._id).select(
        "-password -refreshToken"   //these fields are not required
    )

    //check for user creation
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    //return response
    return res.status(200)     //sets the HTTP status code for the response
    .json(          //sends the response back to the client in JSON format.
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser= asyncHandler( async (req, res) => {
    // retrieve data from req body
    const {email, username, password}= req.body
    //console.log(email)
    
    //if both username and email not there 
    if(!username && !email){
        throw new ApiError(400, "Username or email is required")
    }

    //if either username or email there
    const user= await User.findOne({
        $or: [{username}, {email}]   //mongodb operator
    })
    if(!user){
        throw new ApiError(404, "User does not exist")
    }

    //check password
    const isPasswordValid= await user.isPasswordCorrect(password)
    if(!isPasswordValid){
        throw new ApiError(404, "Invalid User credentials")
    }

    //create access and refresh tokens
    const {accessToken, refreshToken}= await generateAccessAndRefreshTokens(user._id)

    //send data to cookies
    const loggedInUser= await User.findById(user._id)
    .select(" -password  -refreshToken")   //fields not to be included, have to follow this exact syntax

    //cookies
    const options= {
        httpOnly: true,   //cookies can be modified by anyone by default but httpOnly: true ensures that the cookie can be modified by the server only
        secure: true
    }

    return res.status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(            //response in JSON format
        new ApiResponse(
            200,
            {
                user: loggedInUser, accessToken, refreshToken
            },
            "User logged In successfully"
        )
    )
})

const logoutUser= asyncHandler( async(req, res) => {
    //remove refresh token from the database
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $unset: {   //this removes the field from the document
                refreshToken: 1 
            }
        },
        {
            new: true
        }
    )

    //cookies
    const options= {
        httpOnly: true,   //cookies can be modified by anyone by default but httpOnly: true ensures that the cookie can be modified by the server only
        secure: true
    }

    return res.status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, {}, "User logged out"))
})

//to refresh token at an endpoint
const refreshAccessToken= asyncHandler( async(req, res) => {
    const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken
    
    if(!incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Request")
    }
    
    try {
        const decodedToken= jwt.verify(         //decoded information
            incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET
        )
    
        const user= await User.findById(decodedToken?._id)
        if(!user){
            throw new ApiError(401, "Invalid Refresh Token")
        }
        
        if(incomingRefreshToken !== user?.refreshToken){
            throw new ApiError(401, "Refresh Token is expired or used")
        }
    
        const options={
            httpOnly: true,
            secure: true
        }
    
        const{accessToken, newRefreshToken}= await generateAccessAndRefreshTokens(user._id)
    
        return res.status(200)
        .cookie("accessToken", accessToken, options)
        .cookie("refreshToken", newRefreshToken, options)
        .json(
            new ApiResponse(
                200, 
                {accessToken, refreshToken: newRefreshToken},
                "Access token refreshed"
            )
        )
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid refresh token")
    }
})

const changeCurrentPassword= asyncHandler( async(req, res) => {
    const {oldPassword, newPassword}= req.body
    const user= await User.findById(req.user?._id)    // ? is used to denote that if user does not exist then return undefined and not any error
    const isPasswordCorrect= await user.isPasswordCorrect(oldPassword)
    if(!isPasswordCorrect){
        throw new ApiError(400, "Invalid old password")
    }
    user.password= newPassword
    await user.save({validateBeforeSave: false})  //mongoose will not check required fields, min/max, regex, unique (soft check), etc. 
    return res.status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"))

    //optional
    // if(!(newPassword=== oldPassword)){
    //     throw new ApiError(400, "New password is same as the old password") 
    // }
})

const getCurrentUser= asyncHandler( async(req, res) => {
    return res.status(200)
    .json(new ApiResponse(200, req.user, "Current user fetched successfully"))
})

const updateAccountDetails= asyncHandler( async(req, res) => {
    const {fullname, email}= req.body
    if(!fullname || !email){
        throw new ApiError(400, "All fields are required")
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                fullname: fullname,
                email: email
            }
        },
        {new: true} //returns information after updation
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, user, "Account details updated successfully"))
})

const updateUserAvatar= asyncHandler( async(req, res) => {
    const avatarLocalPath= req.file?.path
    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is missing")
    }
    const avatar= await uploadOnCloudinary(avatarLocalPath)
    if(!avatar.url){
        throw new ApiError(400, "Error while uploading avatar")
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                avatar: avatar.url
            }
        },
        {new: true}
    ).select("-password")

    return res.status(200)
    .json(new ApiResponse(200, {}, "Avatar updated successfully"))
})

const updateUserCoverImage= asyncHandler( async(req, res) => {
    const coverImageLocalPath= req.file?.path
    if(!coverImageLocalPath){
        throw new ApiError(400, "Cover image file is missing")
    }
    const coverImage= await uploadOnCloudinary(coverImageLocalPath)
    if(!coverImage.url){
        throw new ApiError(400, "Error while uploading cover image")
    }

    const user= await User.findByIdAndUpdate(
        req.user?._id,
        {
            $set: {
                coverImage: coverImage.url
            }
        },
        {new: true}
    ).select("-password")

    return user.status(200)
    .json(new ApiResponse(200, {}, "Cover image uploaded successfully"))
})

const getUserChannelProfile= asyncHandler( async(req, res) => {
    const {username}= req.params
    if(!username?.trim()){
        throw new ApiError(400, "Username is missing")
    }

    const channel = await User.aggregate([
        {
            $match: {                      //filter documents
                username: username?.toLowerCase()
            }
        },
        {
            $lookup: {                   //subcribers of users
                from: "subscriptions",   //models are always stored in plural form and lowercase in mongodb,
                localField: "_id",
                foreignField: "channel",
                as: "subscribers"
            }
        },
        {
            $lookup: {                  //users subscribed
                from: "subscriptions",
                localField: "_id",
                foreignField: "subscriber",
                as: "subscribedTo"
            }
        },
        {
            $addFields: {     //adds additional fields subscribers and subscribedTo in the user document
                subscriberCount: {        //returns the number of subscribers
                    $size: "$subscribers"       //use $ because it is a field 
                },
                channelsSubscribedToCount: {     //returns the number of subscribed
                    $size: "$subscribedTo"        //use $ because it is a field 
                },
                isSubscribed: {             //whether subscribed or not
                    $cond: {
                        if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                        then: true,
                        else: false
                    }
                }
            }
        },
        {
            $project: {    //projection (1- include, 0- exclude)
                fullname: 1,
                username: 1,
                subscriberCount: 1,
                channelsSubscribedToCount: 1,
                isSubscribed: 1,
                avatar: 1,
                coverImage: 1,
                email: 1
            }
        }
    ])

    if(!channel?.length){
        throw new ApiError(404, "Channel does not exist")
    }

    return res.status(200)
    .json(new ApiResponse(200, channel[0], "User channel fetched successfully"))
})

const getWatchHistory= asyncHandler( async(req, res) => {
    //req.user._id: gives a string which mongoose processes and gets the mongodb object ID
    const user= await User.aggregate([
        {
            $match: {
                _id: new mongoose.Types.ObjectId(req.user?._id)
            }
        },
        {
            $lookup: {
                from: "videos",
                localField: "watchHistory",
                foreignField: "_id",
                as: "watchHistory",
                pipeline: [     //nested pipeline
                    {
                        $lookup: {
                            from: "users",
                            localField: "owner",
                            foreignField: "_id",
                            as: "owner",
                            pipeline: [
                                {
                                    $project: {
                                        fullname: 1,
                                        username: 1,
                                        avatar: 1
                                    }
                                }
                            ]
                        }
                    },
                    {
                        $addFields: {
                            owner: {
                                $first: "$owner"  //$first takes the first element from the owner array which makes owner a single object instead of [{...}].
                            }
                        }
                    }
                ]
            }
        }
    ])
    
    return res.status(200)
    .json(new ApiResponse(
        200, 
        user[0].watchHistory,
        "Watch history fetched successfully"
    ))
})

export {
    registerUser, 
    loginUser, 
    logoutUser,
    refreshAccessToken,
    changeCurrentPassword,
    getCurrentUser,
    updateAccountDetails,
    updateUserAvatar,
    updateUserCoverImage,
    getUserChannelProfile,
    getWatchHistory
}