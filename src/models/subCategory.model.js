import mongoose from "mongoose";
const subCategorySchema = new mongoose.Schema(
    {
        name: {
            type: String,
            required: true,
            trim: true
        },
        slug:{
            type:String,
            unique:true,
            required:true,
            trim:true,
            lowercase:true

        },

        category: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Category",
            required: true
        },
        

        description: {
            type: String,
            default: ""
        },

        image: {
            type: String,
            required:true,
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
    }
);



export default mongoose.models.SubCategory ||
    mongoose.model("SubCategory", subCategorySchema);