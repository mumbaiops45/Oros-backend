import mongoose from "mongoose";

const productOptionValueSchema = new mongoose.Schema(
    {
        option: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "ProductOption",
            required: true,
            index: true
        },

        value: {
            type: String,
            required: true,
            trim: true
        },

        priceDelta: {
            type: Number,
            default: 0
        },

        priceMultiplier: {
            type: Number,
            default: 1,
            min: 0
        },

        sortOrder: {
            type: Number,
            default: 1,
            min: 1
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.ProductOptionValue ||
    mongoose.model(
        "ProductOptionValue",
        productOptionValueSchema
    );