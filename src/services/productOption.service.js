import mongoose from "mongoose";
import Product from "../models/product.model.js";
import ProductOption from "../models/productOption.model.js";
import ProductOptionValue from "../models/productOptionValue.model.js";
import { httpError } from "../utils/httpError.js";

const OPTION_TYPES = ["SELECT", "TEXT", "COLOR", "FILE"];

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

export const getOptionsService = async (productId) => {

    await ensureProduct(productId);

    const options = await ProductOption.find({ product: productId })
        .sort({ createdAt: 1 })
        .lean();

    const optionIds = options.map((option) => option._id);

    const values = optionIds.length
        ? await ProductOptionValue.find({
            option: { $in: optionIds }
        })
            .sort({ sortOrder: 1 })
            .lean()
        : [];

    const data = options.map((option) => ({
        ...option,
        values: values.filter(
            (value) =>
                value.option.toString() === option._id.toString()
        )
    }));

    return {
        message: "Product options fetched successfully",
        data: {
            options: data
        }
    };
};

export const createOptionService = async (productId, data) => {

    await ensureProduct(productId);

    if (!data.name) {
        throw httpError(400, "Option name is required");
    }

    const type = String(data.type || "").toUpperCase();

    if (!OPTION_TYPES.includes(type)) {
        throw httpError(
            400,
            `Option type must be one of ${OPTION_TYPES.join(", ")}`
        );
    }

    const duplicate = await ProductOption.findOne({
        product: productId,
        name: data.name
    }).lean();

    if (duplicate) {
        throw httpError(
            409,
            "This option already exists on the product"
        );
    }

    const option = await ProductOption.create({
        product: productId,
        name: data.name,
        type,
        isRequired: Boolean(data.isRequired)
    });

    return {
        message: "Product option created successfully",
        data: {
            option
        }
    };
};

export const updateOptionService = async (
    productId,
    optionId,
    data
) => {

    await ensureProduct(productId);

    const update = {};

    if (data.name !== undefined) {
        update.name = data.name;
    }

    if (data.type !== undefined) {

        const type = String(data.type).toUpperCase();

        if (!OPTION_TYPES.includes(type)) {
            throw httpError(
                400,
                `Option type must be one of ${OPTION_TYPES.join(", ")}`
            );
        }

        update.type = type;
    }

    if (data.isRequired !== undefined) {
        update.isRequired = Boolean(data.isRequired);
    }

    const option = await ProductOption.findOneAndUpdate(
        {
            _id: optionId,
            product: productId
        },
        update,
        {
            new: true,
            runValidators: true
        }
    );

    if (!option) {
        throw httpError(404, "Product option not found");
    }

    return {
        message: "Product option updated successfully",
        data: {
            option
        }
    };
};

/**
 * Deleting an option also deletes its values.
 */
export const deleteOptionService = async (productId, optionId) => {

    await ensureProduct(productId);

    const option = await ProductOption.findOneAndDelete({
        _id: optionId,
        product: productId
    });

    if (!option) {
        throw httpError(404, "Product option not found");
    }

    await ProductOptionValue.deleteMany({ option: option._id });

    return {
        message: "Product option deleted successfully",
        data: {
            option
        }
    };
};
