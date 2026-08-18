import mongoose from "mongoose";

const priceSlabSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },

        minQty: {
            type: Number,
            required: true,
            min: 1
        },

        maxQty: {
            type: Number,
            default: null,
            min: 1
        },

        unitPrice: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.PriceSlab ||
    mongoose.model("PriceSlab", priceSlabSchema);