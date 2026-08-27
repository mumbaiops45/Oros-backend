import { createQuotationService,updateQuotationService,updateQuotationByAdminService } from "../services/quotation.service.js";

export const createQuotation=async(req,res)=>{
    const formData ={...req.body,files:req.files||[]};
const {message,data}= await  createQuotationService(req.user.id,formData);
res.json({
    success: true,
    message,
    data
});
}

// Customer update
export const updateQuotation = async (req, res) => {

    const { id } = req.params;

    const data = {
        ...req.body,
        files: req.files || []
    };

    const { message, data: result } =
        await updateQuotationService(
            id,
            req.user.id,
            data
        );

    res.json({
        success: true,
        message,
        data: result
    });
};


// Admin update
export const updateQuotationByAdmin = async (req, res) => {

    const { id } = req.params;

    const data = {
        ...req.body
    };

    const { message, data: result } =
        await updateQuotationByAdminService(
            id,
            data
        );

    res.json({
        success: true,
        message,
        data: result
    });
};

