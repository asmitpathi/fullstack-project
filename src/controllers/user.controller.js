import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js" 
import jwt from "jsonwebtoken"

const generateAccessAndRefreshTokens= async(userId) => {
    try {
        const user= await User.findById(userId)  //find user based on userId
        const accessToken= user.generateAccessToken()  //generate access token
        const refreshToken= user.generateRefreshToken()  //generate refresh token
        user.refreshToken= refreshToken
        user.save({validateBeforeSave: false})  //save refresh token in database
        return {accessToken, refreshToken}
    } catch (error) {
        throw new ApiError(500, "Something went wrong while generating access and refresh tokens")
    }
}

const registerUser= asyncHandler(async(req, res) => {
    //get user details from frontend
    const { fullname, username, email, password} = req.body
    //console.log("email: ", email)
    
    //validation_ if any field is empty
    if(
        [fullname, username, email, password].some((field) =>   //returns true if any element of array is empty 
        field?.trim()==="")    
    ){
        throw new ApiError(400, "All fields are required")
    }

    //check if user already exists
    const existedUser= await User.findOne({
        $or: [{username}, {email}]
    })
    if(existedUser){
        throw new ApiError(409, "User with email or username already exists")
    }

    //upload images and avatars and check for avatar
    const avatarLocalPath= req.files?.avatar[0]?.path   //? means optional
    
    let coverImageLocalPath;
    if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
        coverImageLocalPath = req.files.coverImage[0].path
    }

    if(!avatarLocalPath){
        throw new ApiError(400, "Avatar file is required")
    }

    //upload images and avatars to cloudinary
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
        "-password -refreshToken"   //these are not required
    )

    //check for user creation
    if(!createdUser){
        throw new ApiError(500, "Something went wrong while registering the user")
    }

    //return response
    return res.status(201).json(
        new ApiResponse(200, createdUser, "User registered successfully")
    )
})

const loginUser= asyncHandler( async (req, res) => {
    // retrieve data from req body
    const {email, username, password}= req.body
    console.log(email)
    
    //if both username and email not there 
    if(!username && !email){
        throw new ApiError(400, "Username or email is required")
    }

    //if username or email there
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
    .json(
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
    await User.findByIdAndUpdate(
        req.user._id,
        {
            $set: {
                refreshToken: undefined
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
    .json( new ApiResponse(200, {}, "User logged out"))
})

const refreshAccessToken= asyncHandler( async(req, res) => {
    const incomingRefreshToken= req.cookies.refreshToken || req.body.refreshToken
    
    if(incomingRefreshToken){
        throw new ApiError(401, "Unauthorized Request")
    }
    
    try {
        const decodedToken= jwt.verify(
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

export {
    registerUser, 
    loginUser, 
    logoutUser,
    refreshAccessToken
}