import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app= express()

//app.use() is mostly used in case of middlewares and configuration

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))  //accept json files and put a limit on the total size of all files combined 
app.use(express.urlencoded({extended: true, limit: "16kb"}))  //handle the different cases of url encoding
app.use(express.static("public"))  //create a public folder to store public assets that can be accessed by anyone
app.use(cookieParser())

//routes import
import userRouter from "./routes/user.route.js"

//routes declaration
app.use("/api/v1/users", userRouter)

export { app }