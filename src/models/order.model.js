import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
    {


        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true
        },
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
       default: null,
            index: true
        },

        source: {
            type: String,
            enum: [
                "STORE",
                "QUOTATION",
                "MANUAL"
            ],
            default: "STORE"
        },

        quotation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Quotation",
            default: null
        },

        status: {
            type: String,
            enum: [
                "PENDING_PAYMENT",
                "PAID",
                "CONFIRMED",
                "PROCESSING",
                "IN_PRODUCTION",
                "COMPLETED",
                "CANCELLED"
            ],
            default: "PENDING_PAYMENT"
        },

        pricing: {
            subtotal: {
                type: Number,
                required: true,
                min: 0
            },

            shipping: {
                type: Number,
                required: true,
                min: 0
            },

            tax: {
                type: Number,
                required: true,
                min: 0
            },

            total: {
                type: Number,
                required: true,
                min: 0
            }
        },

        shippingAddress: {
            name: String,
            phone: String,
            addressLine1: String,
            addressLine2: String,
            city: String,
            state: String,
            country: String,
            pincode: String
        },

        shipping: {
            pickupPincode: String,
            deliveryPincode: String,

            courierId: {
                type: Number,
                default: null
            },

            courierName: {
                type: String,
                default: null
            },

            shippingCharge: {
                type: Number,
                min: 0
            },

            estimatedDelivery: Date
        },
        payment: {
            method: {
                type: String,
                enum: [
                    "ONLINE",
                    "CASH",
                    "UPI",
                    "CARD"
                ],
                default: null
            },

            provider: {
                type: String,
                enum: [
                    "RAZORPAY",
                    "CASH",
                    "UPI",
                    "CARD"
                ],
                default: null
            },

            status: {
                type: String,
                enum: [
                    "PENDING",
                    "PAID",
                    "FAILED",
                    "REFUNDED"
                ],
                default: "PENDING"
            },

            paymentOrderId: {
                type: String,
                default: null
            },

            transactionId: {
                type: String,
                default: null
            },

            paidAt: {
                type: Date,
                default: null
            }
        },

        notes: {
            type: String,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.Order ||
    mongoose.model("Order", orderSchema);