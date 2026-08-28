import mongoose from "mongoose";

const quotationFileSchema = new mongoose.Schema({
    quotation: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Quotation",
        required: true,
        index: true
    },
    fileUrl: {
        type: String,
        default: null
    },
    fileName: {
        type: String,
        default: null
    },
    mime: {
        type: String,
        default: null
    },
    size: {
        type: Number,
        default: null
    },
},
    {
        timestamps: true
    })

export default mongoose.models.quotationfile || mongoose.model("quotationfile", quotationFileSchema)