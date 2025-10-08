import { ApiError } from "../utils/ApiError.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import jwt from "jsonwebtoken";
import { User } from "../models/user.model.js";

//verifies if user exists or not based on access nd refresh token
export const verifyJWT= asyncHandler( async(req, _, next) => {   //here res object is not used so _ is added which is a production convention for ignored parameters.
    try {
        const token= req.cookies?.accessToken || req.header("Authorization")?.replace("Bearer ", "")  //take token from cookies or from authorization/header
    
        if(!token){
            throw new ApiError(401, "Unauthorized request")
        }
    
        const decodedToken= jwt.verify(token, process.env.ACCESS_TOKEN_SECRET)   //verify access token
    
        const user= await User.findById(decodedToken?._id)
        .select("-password -refreshToken")   //fields to exclude
    
        if(!user){
            throw new ApiError(401, "Invalid Access Token")
        }
    
        req.user= user  //The verified user object is stored in req.user, making it available to subsequent controllers
        next()   //allows Express to move to the next middleware or route handler.
    } catch (error) {
        throw new ApiError(401, error?.message || "Invalid Access Token")
    }
})