import mongoose from "mongoose";

const productSpecSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },

        label: {
            type: String,
            required: true,
            trim: true
        },

        value: {
            type: String,
            required: true,
            trim: true
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

export default mongoose.models.ProductSpec ||
    mongoose.model("ProductSpec", productSpecSchema);