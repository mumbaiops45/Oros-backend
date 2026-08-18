import mongoose from "mongoose";

const productMediaSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            index: true
        },

        type: {
            type: String,
            enum: ["IMAGE", "VIDEO"],
            required: true
        },

        url: {
            type: String,
            required: true
        },

        provider: {
            type: String,
            default: "cloudinary"
        },

        publicId: {
            type: String,
            default: ""
        },

        posterUrl: {
            type: String,
            default: ""
        },

        altText: {
            type: String,
            default: ""
        },

        sortOrder: {
            type: Number,
            default: 1
        },

        isPrimary: {
            type: Boolean,
            default: false
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.ProductMedia ||
    mongoose.model("ProductMedia", productMediaSchema);