import mongoose from "mongoose";

const productShippingSchema = new mongoose.Schema(
    {
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true,
            unique: true,
            index: true
        },

        weight: {
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
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.ProductShipping ||
    mongoose.model(
        "ProductShipping",
        productShippingSchema
    );