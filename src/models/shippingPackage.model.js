import mongoose from "mongoose";

const shippingPackageSchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },

        maxWeight: {
            type: Number,
            required: true,
            min: 0
        },

        length: {
            type: Number,
            required: true,
            min: 0.5
        },

        width: {
            type: Number,
            required: true,
            min: 0.5
        },

        height: {
            type: Number,
            required: true,
            min: 0.5
        },

        isActive: {
            type: Boolean,
            default: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.ShippingPackage ||
    mongoose.model(
        "ShippingPackage",
        shippingPackageSchema
    );