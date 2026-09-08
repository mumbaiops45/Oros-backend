import mongoose from "mongoose"
import Product from "../models/product.model.js"
import ProductView from "../models/view.model.js";

export const createProduvtViewService=async(productId,userId,duration)=>{
    const product = await Product.findById(productId);
    if (!product) {
        throw new Error("product not found");
    }
    const productView= await ProductView.create({
        product:productId,
        user:userId || null,
        duration
    })

    return{
        message:"product view track successfully",
        data:{
            productView
        }
    }
}