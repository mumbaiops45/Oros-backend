import mongoose from "mongoose";
import Product from "../models/product.model.js";
import PriceSlab from "../models/priceSlab.model.js";
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

/**
 * maxQty = null means "and above", so it is treated as Infinity.
 */
const overlaps = (a, b) => {

    const aMax = a.maxQty ?? Infinity;
    const bMax = b.maxQty ?? Infinity;

    return a.minQty <= bMax && b.minQty <= aMax;
};

const validateSlab = async (productId, slab, excludeId = null) => {

    if (!Number.isFinite(slab.minQty) || slab.minQty < 1) {
        throw httpError(400, "minQty must be a number of 1 or more");
    }

    if (
        slab.maxQty !== null &&
        (!Number.isFinite(slab.maxQty) || slab.maxQty < slab.minQty)
    ) {
        throw httpError(
            400,
            "maxQty must be empty or greater than or equal to minQty"
        );
    }

    if (!Number.isFinite(slab.unitPrice) || slab.unitPrice < 0) {
        throw httpError(400, "unitPrice must be a positive number");
    }

    const filter = { product: productId };

    if (excludeId) {
        filter._id = { $ne: excludeId };
    }

    const existing = await PriceSlab.find(filter).lean();

    const clash = existing.find((item) => overlaps(slab, item));

    if (clash) {
        throw httpError(
            409,
            `Quantity range overlaps an existing slab (${clash.minQty} - ${clash.maxQty ?? "above"})`
        );
    }
};

const readSlabInput = (data, fallback = {}) => ({
    minQty:
        data.minQty !== undefined
            ? Number(data.minQty)
            : fallback.minQty,
    maxQty:
        data.maxQty !== undefined
            ? data.maxQty === null || data.maxQty === ""
                ? null
                : Number(data.maxQty)
            : fallback.maxQty ?? null,
    unitPrice:
        data.unitPrice !== undefined
            ? Number(data.unitPrice)
            : fallback.unitPrice
});

export const getPriceSlabsService = async (productId) => {

    await ensureProduct(productId);

    const priceSlabs = await PriceSlab.find({ product: productId })
        .sort({ minQty: 1 })
        .lean();

    return {
        message: "Price slabs fetched successfully",
        data: {
            priceSlabs
        }
    };
};

export const createPriceSlabService = async (productId, data) => {

    await ensureProduct(productId);

    const slab = readSlabInput(data);

    await validateSlab(productId, slab);

    const priceSlab = await PriceSlab.create({
        product: productId,
        ...slab
    });

    return {
        message: "Price slab created successfully",
        data: {
            priceSlab
        }
    };
};

export const updatePriceSlabService = async (
    productId,
    slabId,
    data
) => {

    await ensureProduct(productId);

    const existing = await PriceSlab.findOne({
        _id: slabId,
        product: productId
    }).lean();

    if (!existing) {
        throw httpError(404, "Price slab not found");
    }

    const slab = readSlabInput(data, existing);

    await validateSlab(productId, slab, slabId);

    const priceSlab = await PriceSlab.findByIdAndUpdate(
        slabId,
        slab,
        {
            new: true,
            runValidators: true
        }
    );

    return {
        message: "Price slab updated successfully",
        data: {
            priceSlab
        }
    };
};

export const deletePriceSlabService = async (productId, slabId) => {

    await ensureProduct(productId);

    const priceSlab = await PriceSlab.findOneAndDelete({
        _id: slabId,
        product: productId
    });

    if (!priceSlab) {
        throw httpError(404, "Price slab not found");
    }

    return {
        message: "Price slab deleted successfully",
        data: {
            priceSlab
        }
    };
};
