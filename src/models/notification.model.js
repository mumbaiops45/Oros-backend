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
            "ORDER_PAID_AND_PAYMENT_RECEIVED",
            'QUOTATION_CREATED',
            "QUOTATION_FILE",
            "QUOTATION",
            "QUOTATION_CANCEL",
            "QUOTATION_MESSAGE",
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
    },
    isRead: {
    type: Boolean,
    default: false
}
},
{
    timestamps:true
})
export default mongoose.models.Notification || mongoose.model("Notification",notificationSchema)