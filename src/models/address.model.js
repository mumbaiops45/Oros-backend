import mongoose from "mongoose";

const addressSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            unique: true,
            index: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        phone: {
            type: String,
            required: true,
            trim: true
        },

        addressLine1: {
            type: String,
            required: true,
            trim: true
        },

        addressLine2: {
            type: String,
            trim: true,
            default: ""
        },

        landmark: {
            type: String,
            trim: true,
            default: ""
        },

        city: {
            type: String,
            required: true,
            trim: true
        },

        state: {
            type: String,
            required: true,
            trim: true
        },

        country: {
            type: String,
            default: "India",
            trim: true
        },

        pincode: {
            type: String,
            required: true,
            trim: true
        },

        // latitude: {
        //     type: Number,
        //     default: null
        // },

        // longitude: {
        //     type: Number,
        //     default: null
        // }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.Address ||
    mongoose.model("Address", addressSchema);