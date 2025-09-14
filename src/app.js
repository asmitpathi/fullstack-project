import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app= express()

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))  //accept json files and put a limit on the size
app.use(express.urlencoded({extended: true, limit: "16kb"}))  //handle the different cases of url encoder
app.use(express.static("public"))  //create a public folder to store public assets that can be accessed by anyone

export { app }