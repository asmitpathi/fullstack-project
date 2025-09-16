import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

export const verifyJWT= asyncHandler( async(req, _, next) => {   //here res is not used so _ is added which is a production level code practice 
    try {
        const token= req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")  //take token from cookies or from authorization/header
    
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken= jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)   //verify token
    
        const user= await User.findById(decodedToken?._id)
        .select("-password -refreshToken")
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user= user
        next()   //to execute the next method 
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }
})