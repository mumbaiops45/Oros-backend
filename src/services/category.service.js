import Category from "../models/category.model.js";
import cloudinary from "../config/cloudinary.js";

export const getAllcategoryService = async (page=1,limit=5) => {

    page=Number(page);
    limit=Number(limit);

    const skip = (page-1)*limit;
    const category = await Category.find().sort({createdAt:-1}).skip(skip).limit(limit);
    return {
                 message: "all category",
        data: {
            category
        }
    }
}

export const createCategoryServices = async (data) => {
    const exist = await Category.findOne({
        name: data.name
    })
    if (exist) {
        throw new Error("category already exist");
    };
    const category = await Category.create(data);
    return {
        message: "category created successfully",
        data: {
            category
        }
    }
}

export const updateCategoryByIdServices = async (id, data) => {
    const oldcategory = await Category.findOne({ _id: id }).lean();

    if (!oldcategory) {
        throw new Error("Category not found");

    }
    const oldImagePublicId = oldcategory.imagePublicId;


    const category = await Category.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true
    })
    if (!category) {
        throw new Error("category not found");

    }

    if (data.image && oldImagePublicId) {
        await cloudinary.uploader.destroy(oldImagePublicId);

    }

    return {
        message: "Category updated successfully",
        data: {
            category
        }
    }
}

export const deleteCategoryByIdServices = async (id) => {
    const category = await Category.findById(id).lean();
    if (!category) {
        throw new Error("Category not found");

    };

    const oldImagePublicId = category.imagePublicId;

    await Category.findByIdAndDelete(id);
    if (oldImagePublicId) {
        await cloudinary.uploader.destroy(oldImagePublicId);

    }

    return {
        message: "Category delete  successfully",
        data: {
            category
        }
    }
}