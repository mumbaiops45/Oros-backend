import mongoose from "mongoose";
const quotationMassageSchema = new mongoose.Schema({
    quotation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quotation",
        required: true,
        index: true
    },
    sender: {
        type: String,
        enum: ["CUSTOMER", "ADMIN"],
        required: true
    },
    message: {
        type: String,
        required: true
    }
},
    {
        timestamps: true
    })

    export default mongoose.models.QuotationMessage || mongoose.model("QuotationMesaage",quotationMassageSchema)