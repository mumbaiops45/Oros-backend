import SubCategory from "../models/subCategory.model.js";
import cloudinary from "../config/cloudinary.js";

export const getAllSubCategoryservice = async ({filter,page=1,limit=15}) => {
        page=Number(page);
    limit=Number(limit);
    const skip = (page-1)*limit;
    const subCategory = await SubCategory.find(filter).skip(skip).limit(limit).lean();
    return {
        message: "successfull",
        data: {
            subCategory
        }
    }
}


export const createSubCategoryService = async (data) => {
    const exist = await SubCategory.findOne({
        category: data.category,
        name: data.name
    }).lean();

    if (exist) {
        throw new Error("Subcategory already exists in this category");

    }


    const subCategory = await SubCategory.create(data)
    return {
        message: "Sub-Category created successfully",
        data: {
            subCategory
        }
    }
}

export const updateSubCategoryService = async(id, data) => {
    const exist = await SubCategory.findOne({ _id: id }).lean();
    if (!exist) {
        throw new Error("subCategory not fouund");
    };
    const oldImagePublicId = exist.imagePublicId;

    const subCategory = await SubCategory.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true
    })
    if (data.image && oldImagePublicId) {
        await cloudinary.uploader.destroy(oldImagePublicId);
    }

    return {
        message: "subcategory successfully updated",
        data: {
            subCategory
        }
    }

}
export const deleteSubCategoryService = async(id) => {
    const exist = await SubCategory.findOne({ _id: id }).lean();
    if (!exist) {
        throw new Error("subCategory not fouund");
    };
    const oldImagePublicId = exist.imagePublicId;

    const subCategory = await SubCategory.findByIdAndDelete(id)
    if (oldImagePublicId) {
        await cloudinary.uploader.destroy(oldImagePublicId);
    }

    return {
        message: "subcategory successfully deleted",
        data: {
            subCategory
        }
    }

}


