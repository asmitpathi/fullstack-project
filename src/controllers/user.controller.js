import {asyncHandler} from "../utils/asyncHandler.js"
import { ApiError } from "../utils/ApiError.js"
import {User} from "../models/user.model.js"
import {uploadOnCloudinary} from "../utils/cloudinary.js"
import { ApiResponse } from "../utils/ApiResponse.js"

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

export {registerUser}