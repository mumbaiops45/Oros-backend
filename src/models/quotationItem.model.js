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

        selectedOptions: {
            type: [
                {
                    name: {
                        type: String,
                        required: true,
                        trim: true
                    },

                    value: {
                        type: String,
                        required: true,
                        trim: true
                    }
                }
            ],
            default: []
        },

        personalisation: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
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

export default mongoose.models.quotationItem ||
    mongoose.model("quotationItem", quotationItemSchema);