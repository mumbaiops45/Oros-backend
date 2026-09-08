import mongoose from "mongoose";

export const productViewSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
        index: true
    },
    user: {

        type: mongoose.Schema.Types.ObjectId,
        ref: "User",
        default: null

    },
    duration:{
        type:Number,
        required:true,
        min:0
    }


})

export default mongoose.models.ProductView || mongoose.model("ProductView",productViewSchema)