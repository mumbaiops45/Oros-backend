import mongoose from "mongoose";

export const notificationSchema= new mongoose.Schema({
    recipient:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"User",
        required:true
    },
    type:{
        type:String,
        enum:[
            "OORDER_PAID_AND_PAYMENT_RECEIVED",
            'QUOTATION_CREATED',
            "WUOTATION_QUOTED",
            "QUOTATION_MASSAGE",
            "QUOTATION_ACCEPTED",
        ],
        required:true
    },
    message:{
        type : String,
        required:true
    },
    referenceId:{
        type:mongoose.Schema.Types.ObjectId,
        default:null
    }
},
{
    timestamps:true
})
export default mongoose.models.Notification || mongoose.model("Notification",notificationSchema)