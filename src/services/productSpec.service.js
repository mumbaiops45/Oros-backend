import mongoose from "mongoose";
import Product from "../models/product.model.js";
import ProductSpec from "../models/productSpec.model.js";
import { httpError } from "../utils/httpError.js";

const ensureProduct = async (productId) => {

    if (!mongoose.isValidObjectId(productId)) {
        throw httpError(400, "Invalid product id");
    }

    const product = await Product.findById(productId)
        .select("_id")
        .lean();

    if (!product) {
        throw httpError(404, "Product not found");
    }

    return product;
};

const nextSortOrder = async (productId) => {

    const last = await ProductSpec.findOne({ product: productId })
        .sort({ sortOrder: -1 })
        .select("sortOrder")
        .lean();

    return last ? last.sortOrder + 1 : 1;
};

export const getSpecsService = async (productId) => {

    await ensureProduct(productId);

    const specs = await ProductSpec.find({ product: productId })
        .sort({ sortOrder: 1 })
        .lean();

    return {
        message: "Product specs fetched successfully",
        data: {
            specs
        }
    };
};

export const createSpecService = async (productId, data) => {

    await ensureProduct(productId);

    if (!data.label || !data.value) {
        throw httpError(400, "label and value are required");
    }

    const spec = await ProductSpec.create({
        product: productId,
        label: data.label,
        value: data.value,
        sortOrder:
            data.sortOrder !== undefined
                ? Number(data.sortOrder)
                : await nextSortOrder(productId)
    });

    return {
        message: "Product spec created successfully",
        data: {
            spec
        }
    };
};

export const updateSpecService = async (
    productId,
    specId,
    data
) => {

    await ensureProduct(productId);

    const spec = await ProductSpec.findOneAndUpdate(
        {
            _id: specId,
            product: productId
        },
        {
            ...(data.label !== undefined && { label: data.label }),
            ...(data.value !== undefined && { value: data.value }),
            ...(data.sortOrder !== undefined && {
                sortOrder: Number(data.sortOrder)
            })
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (!spec) {
        throw httpError(404, "Product spec not found");
    }

    return {
        message: "Product spec updated successfully",
        data: {
            spec
        }
    };
};

export const deleteSpecService = async (productId, specId) => {

    await ensureProduct(productId);

    const spec = await ProductSpec.findOneAndDelete({
        _id: specId,
        product: productId
    });

    if (!spec) {
        throw httpError(404, "Product spec not found");
    }

    return {
        message: "Product spec deleted successfully",
        data: {
            spec
        }
    };
};
