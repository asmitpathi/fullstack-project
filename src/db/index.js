import mongoose from "mongoose"
import { DB_NAME } from "../constants.js"

//connnect database
const connectDB= async ()=>{
    try{
        const connectionInstance= await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log(`\nMongoDB Connected !! DB HOST: ${connectionInstance.connection.host}`)
    }catch(error){
        console.log("MongoDB Connection Failed: ", error)
        process.exit(1) //0- success, 1- error
    }
}

export default connectDB