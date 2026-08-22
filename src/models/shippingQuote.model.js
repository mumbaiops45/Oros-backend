import mongoose from "mongoose";

const shippingQuoteSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },

        pickupPincode: {
            type: String,
            required: true
        },

        deliveryPincode: {
            type: String,
            required: true
        },

        packages: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

        rates: {
            type: mongoose.Schema.Types.Mixed,
            required: true
        },

        expiresAt: {
            type: Date,
            required: true,
            index: true
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.ShippingQuote ||
    mongoose.model(
        "ShippingQuote",
        shippingQuoteSchema
    );