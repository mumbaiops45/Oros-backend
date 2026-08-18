import mongoose from "mongoose";
import ProductOption from "../models/productOption.model.js";
import ProductOptionValue from "../models/productOptionValue.model.js";
import { httpError } from "../utils/httpError.js";

const ensureOption = async (optionId) => {

    if (!mongoose.isValidObjectId(optionId)) {
        throw httpError(400, "Invalid option id");
    }

    const option = await ProductOption.findById(optionId)
        .select("_id")
        .lean();

    if (!option) {
        throw httpError(404, "Product option not found");
    }

    return option;
};

const nextSortOrder = async (optionId) => {

    const last = await ProductOptionValue.findOne({
        option: optionId
    })
        .sort({ sortOrder: -1 })
        .select("sortOrder")
        .lean();

    return last ? last.sortOrder + 1 : 1;
};

export const getOptionValuesService = async (optionId) => {

    await ensureOption(optionId);

    const values = await ProductOptionValue.find({
        option: optionId
    })
        .sort({ sortOrder: 1 })
        .lean();

    return {
        message: "Option values fetched successfully",
        data: {
            values
        }
    };
};

export const createOptionValueService = async (optionId, data) => {

    await ensureOption(optionId);

    if (!data.value) {
        throw httpError(400, "value is required");
    }

    const optionValue = await ProductOptionValue.create({
        option: optionId,
        value: data.value,
        priceDelta:
            data.priceDelta !== undefined
                ? Number(data.priceDelta)
                : 0,
        priceMultiplier:
            data.priceMultiplier !== undefined
                ? Number(data.priceMultiplier)
                : 1,
        sortOrder:
            data.sortOrder !== undefined
                ? Number(data.sortOrder)
                : await nextSortOrder(optionId)
    });

    return {
        message: "Option value created successfully",
        data: {
            optionValue
        }
    };
};

export const updateOptionValueService = async (
    optionId,
    valueId,
    data
) => {

    await ensureOption(optionId);

    const optionValue = await ProductOptionValue.findOneAndUpdate(
        {
            _id: valueId,
            option: optionId
        },
        {
            ...(data.value !== undefined && { value: data.value }),
            ...(data.priceDelta !== undefined && {
                priceDelta: Number(data.priceDelta)
            }),
            ...(data.priceMultiplier !== undefined && {
                priceMultiplier: Number(data.priceMultiplier)
            }),
            ...(data.sortOrder !== undefined && {
                sortOrder: Number(data.sortOrder)
            })
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (!optionValue) {
        throw httpError(404, "Option value not found");
    }

    return {
        message: "Option value updated successfully",
        data: {
            optionValue
        }
    };
};

export const deleteOptionValueService = async (
    optionId,
    valueId
) => {

    await ensureOption(optionId);

    const optionValue = await ProductOptionValue.findOneAndDelete({
        _id: valueId,
        option: optionId
    });

    if (!optionValue) {
        throw httpError(404, "Option value not found");
    }

    return {
        message: "Option value deleted successfully",
        data: {
            optionValue
        }
    };
};
