import {getAllcategoryService, createCategoryServices,updateCategoryByIdServices ,deleteCategoryByIdServices } from "../services/category.service.js";


export const getAllCategory = async(req,res)=>{
    
    const {page,limit} =req.query;


const {message,data} = await getAllcategoryService(page,limit);
res.json({
    success:true,
    message,
    data
})

}

export const createCategory = async(req,res)=>{
const dataCategory = {...req.body};

if (req.file) {
    dataCategory.image=req.file?.path;
    dataCategory.imagePublicId=req.file.filename;
};
const {message,data} = await createCategoryServices(dataCategory);
res.json({
    success:true,
    message,
    data
})

}

export const updateCategory = async(req,res)=>{

    const {id} =req.params;
    const dataUpdate = {...req.body}
    if (req.file) {
        dataUpdate.image=req.file.path;
        dataUpdate.imagePublicId=req.file.filename;
    }

   
       const {message,data}= await updateCategoryByIdServices(id,dataUpdate);

       res.json({
        success:true,
        message,
        data
       })

}

export const deleteCategory = async(req,res)=>{

    const {id} =req.params;
       const {message,data}= await deleteCategoryByIdServices(id);

       res.json({
        success:true,
        message,
        data
       })

}