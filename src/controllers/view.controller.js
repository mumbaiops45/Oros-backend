import { createProduvtViewService } from "../services/productView.service.js";

export const productViewcreate=async (req,res) => {
    const{productId,duration}= req.body;
    const user= req.user?.id || null;
    const{message,data}= await createProduvtViewService(productId,user,duration);
    res.json({
        success:true,
        message,
        data
    })
}