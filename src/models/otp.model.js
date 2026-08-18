import mongoose from "mongoose";
const OtpSchema = new mongoose.Schema({
    phone:{
        type:String,
        unique:true,
        required:true,
        index:true,
    },
    otpHash:{
        type:String,
        required:true
    },
    expireAt:{
        type:Date,
        required:true
    },
    attempts:{
          type:Number,
    default:0
    },
    consumeAt:{
        type:Date,
        default:null
    },
    lockedUntill:{
        type:Date,
        default:null
    }
  
},{
    timestamps:true
})

export default mongoose.models.Otp || mongoose.model("Otp", OtpSchema)