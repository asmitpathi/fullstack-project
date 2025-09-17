import mongoose from "mongoose"

const subscriptionSchema= new mongoose.Schema({
    subscriber: {                             //one who subscribes channels
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    },
    channel: {                                //one whose channel is subscribed
        type: mongoose.Schema.Types.ObjectId,
        ref: "User"
    }
}, {timestamps: true})

export const Subscription= mongoose.model("Subscription", subscriptionSchema)