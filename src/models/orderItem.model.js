import mongoose from "mongoose";

const orderItemsSchema = new mongoose.Schema(
    {
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            required: true,
            index: true
        },

        product: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Product",
            required: true
        },

        nameSnapshot: {
            type: String,
            required: true
        },

        skuSnapshot: {
            type: String,
            required: true
        },

        qty: {
            type: Number,
            required: true,
            min: 1,
            default: 1
        },

        unitPrice: {
            type: Number,
            required: true,
            min: 0
        },

        selectedOptions: {
            type: [
                {
                    name: {
                        type: String,
                        required: true
                    },

                    value: {
                        type: String,
                        required: true
                    }
                }
            ],
            default: []
        },

        personalisation: {
            type: mongoose.Schema.Types.Mixed,
            default: {}
        },

        taxRate: {
            type: Number,
            default: 0,
            min: 0
        },

        taxAmount: {
            type: Number,
            default: 0,
            min: 0
        },

        lineTotal: {
            type: Number,
            required: true,
            min: 0
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.OrderItem ||
    mongoose.model(
        "OrderItem",
        orderItemsSchema
    );