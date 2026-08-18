import mongoose from "mongoose";

const productOptionSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        type: {
            type: String,
            enum: ["SELECT", "TEXT", "COLOR", "FILE"],
            required: true
        },

        isRequired: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.ProductOption ||
    mongoose.model("ProductOption", productOptionSchema);