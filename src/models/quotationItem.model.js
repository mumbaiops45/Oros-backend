import mongoose from "mongoose";

const quotationItemSchema = new mongoose.Schema(
    {
        quotation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quotation",
            required: true,
            index: true
        },

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            default: null
        },

        qty: {
            type: Number,
            min: 1,
            required: true
        },

        unitPrice: {
            type: Number,
            min: 0,
            default: 0
        },

        tax: {
            type: Number,
            min: 0,
            default: 0
        },

        amount: {
            type: Number,
            min: 0,
            default: 0
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.quotationItem || mongoose.model("quotationItem",quotationItemSchema);