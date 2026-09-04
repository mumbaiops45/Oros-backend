import mongoose from "mongoose";

const couponSchema = new mongoose.Schema(
    {
        code: {
            type: String,
            required: true,
            unique: true,
            uppercase: true,
            trim: true
        },

        discountType: {
            type: String,
            enum: ["PERCENTAGE", "FIXED"],
            required: true
        },

        discountValue: {
            type: Number,
            required: true,
            min: 0
        },

        minOrderValue: {
            type: Number,
            default: 0
        },

        startDate: {
            type: Date,
            required: true
        },

        endDate: {
            type: Date,
            required: true
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

const Coupon = mongoose.model("Coupon", couponSchema);

export default Coupon;