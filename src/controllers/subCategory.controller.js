import { createSubCategoryService, getAllSubCategoryservice ,updateSubCategoryService,deleteSubCategoryService} from "../services/subCategory.service.js";

export const getallSubCategory = async (req, res) => {
    const filter = {};
    if (req.query.category) {
        filter.category = req.query.category
    };

    const {page,limit} = req.query
    const {message, data} = await getAllSubCategoryservice({filter,page,limit});
    res.json({
        success: true,
        message,
        data
    })
}


export const createSubcategory = async (req, res) => {
    const dataSubCategory = { ...req.body };
    if (req.file) {
        dataSubCategory.image = req.file.path;
        dataSubCategory.imagePublicId = req.file.filename;
    };
    const { message, data } = await createSubCategoryService(dataSubCategory);
    res.json({
        success: true,
        message,
        data
    })

}

export const updateSubCategory=async   (req,res)=>{

    const {id}=req.params;
    const dataSubCategory = {...req.body};
    if (req.file) {
        dataSubCategory.image=req.file.path,
        dataSubCategory.imagePublicId=req.file.filename
    };
   const {message,data}= await updateSubCategoryService(id,dataSubCategory);
   res.json({
    success:true,
    message,
    data
   })
}


export const deleteSubCategory=async   (req,res)=>{

    const {id}=req.params;
 
   const {message,data}= await deleteSubCategoryService(id);
   res.json({
    success:true,
    message,
    data
   })
}