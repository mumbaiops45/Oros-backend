import mongoose from "mongoose";

export const quotationSchema = new mongoose.Schema(
    {
        refNumber: {
            type: String,
            unique: true
        },

        customer: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true
        },

        type: {
            type: String,
            enum: ["BULK", "CUSTOM"]
        },

        name: {
            type: String
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        email: {
            type: String,
            trim: true,
            lowercase: true
        },

        company: {
            type: String,
            default: "",
            trim: true
        },

        taxRegNo: {
            type: String,
            default: "",
            trim: true
        },

        requirements: {
            type: String,
            default: "",
            trim: true
        },

        deadline: {
            type: Date,
            default: null
        },

        // Customer shipping address
        shippingAddress: {
            name: {
                type: String,
                default: ""
            },

            phone: {
                type: String,
                default: ""
            },

            addressLine1: {
                type: String,
                default: ""
            },

            addressLine2: {
                type: String,
                default: ""
            },

            city: {
                type: String,
                default: ""
            },

            state: {
                type: String,
                default: ""
            },

            country: {
                type: String,
                default: ""
            },

            pincode: {
                type: String,
                default: ""
            }
        },

        status: {
            type: String,
            enum: [
                "PENDING",
                "IN_REVIEW",
                "QUOTED",
                "ACCEPTED",
                "REJECTED",
                "EXPIRED",
                "CONVERTED",
                "CANCELLED"
            ],
            default: "PENDING",
            index: true
        },

        version: {
            type: Number,
            default: 1
        },

        validTill: {
            type: Date,
            default: null
        },

        subTotal: {
            type: Number,
            default: 0
        },

        tax: {
            type: Number,
            default: 0
        },

        shipping: {
            type: Number,
            default: 0
        },

        total: {
            type: Number,
            default: 0
        },

        convertedOrderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            default: null
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.quotation ||
    mongoose.model("quotation", quotationSchema);