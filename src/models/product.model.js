import mongoose from "mongoose";

const productSchema = new mongoose.Schema(
    {
        sku: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            uppercase: true
        },

        name: {
            type: String,
            required: true,
            trim: true
        },

        slug: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true
        },

        subcategory: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "SubCategory",
            required: true
        },

        shortDescription: {
            type: String,
            trim: true,
            default: ""
        },

        longDescription: {
            type: String,
            trim: true,
            default: ""
        },

        basePrice: {
            type: Number,
            required: true,
            min: 0
        },

        taxRate: {
            type: Number,
            default: 0,
            min: 0
        },

        leadTimeDays: {
            type: Number,
            required: true,
            min: 0
        },

        isCustomisable: {
            type: Boolean,
            default: false
        },

        minQty: {
            type: Number,
            default: 1,
            min: 1
        },

        status: {
            type: String,
            enum: ["DRAFT", "PUBLISHED", "ARCHIVED"],
            default: "DRAFT"
        },

        sortOrder: {
            type: Number,
            default: 1,
            min: 1
        },

        seoTitle: {
            type: String,
            trim: true,
            default: ""
        },

        seoDescription: {
            type: String,
            trim: true,
            default: ""
        }
    },
    {
        timestamps: true
    }
);

export default mongoose.models.Product ||
    mongoose.model("Product", productSchema);