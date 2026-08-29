// src/models/cart.model.js

import mongoose from "mongoose";

const cartSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },
        qty: {
            type: Number,
            required: true,
            min: 1,
            default: 1
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

        variantKey: {
            type: String,
            required: true
        },

        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },

        taxRate: {
            type: Number,
            default: 0,
            min: 0
        }
    },
    {
        timestamps: true
    }
);


cartSchema.index(
    {
        user: 1,
        product: 1,
        variantKey: 1
    },
    {
        unique: true
    }
);


export default mongoose.models.Cart ||
    mongoose.model("Cart", cartSchema);