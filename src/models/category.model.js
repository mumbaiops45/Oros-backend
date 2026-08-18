import mongoose from "mongoose";

const categorySchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, "category name is required"],
        trim: true,
        unique: true
    },
    slug: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        lowercase: true
    },

    description: {
        type: String,
        default: ""
    },
    image: {
        type: String,
        default: ""
    },
    imagePublicId: {
        type: String,
        default: ""
    },
    isActive: {
        type: Boolean,
        default: true
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
    },


},
    {
        timestamps: true
    })

export default mongoose.models.Category || mongoose.model("Category", categorySchema);