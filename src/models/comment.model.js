import mongoose from "mongoose"
import mongooseAggregatePaginate from "mongodb-aggregate-paginate-v2"

const commentSchema= new mongoose.Schema({
    content: {
        type: String,
        required: true,
    },
    video: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Video"
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})

tweetSchema.plugin(mongooseAggregatePaginate)

export const Comment= mongoose.model("Comment", commentSchema)