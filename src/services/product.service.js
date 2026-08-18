import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import SubCategory from "../models/subCategory.model.js";
import ProductSpec from "../models/productSpec.model.js";
import ProductMedia from "../models/productMedia.model.js";
import ProductOption from "../models/productOption.model.js";
import ProductOptionValue from "../models/productOptionValue.model.js";
import PriceSlab from "../models/priceSlab.model.js";
import { httpError } from "../utils/httpError.js";
import { destroyFromCloudinary } from "../utils/cloudinaryUpload.js";

export const getProductsService = async (query) => {

    const {
        page = 1,
        limit = 10,
        search,
        category,
        subcategory,
        status
    } = query;

    const filter = {};

    if (search) {
        filter.$or = [
            {
                name: {
                    $regex: search,
                    $options: "i"
                }
            },
            {
                sku: {
                    $regex: search,
                    $options: "i"
                }
            }
        ];
    }

    if (category) {
        filter.category = category;
    }

    if (subcategory) {
        filter.subcategory = subcategory;
    }

    if (status) {
        filter.status = status;
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const skip = (pageNumber - 1) * limitNumber;

    const products = await Product.find(filter)
        .populate("category", "name slug")
        .populate("subcategory", "name slug")
        .sort({ sortOrder: 1 })
        .skip(skip)
        .limit(limitNumber)
        .lean();

    const total = await Product.countDocuments(filter);

    // The storefront grid needs a thumbnail and media lives in its own
    // collection. One extra query for the whole page beats an N+1 per card.
    const media = products.length
        ? await ProductMedia.find({
            product: { $in: products.map((item) => item._id) }
        })
            .sort({ isPrimary: -1, sortOrder: 1 })
            .lean()
        : [];

    const primaryByProduct = new Map();

    for (const item of media) {
        const key = String(item.product);

        if (!primaryByProduct.has(key)) {
            primaryByProduct.set(key, item);
        }
    }

    const productsWithMedia = products.map((product) => ({
        ...product,
        primaryMedia: primaryByProduct.get(String(product._id)) || null
    }));

    return {
        message: "Products fetched successfully",
        data: {
            products: productsWithMedia,
            pagination: {
                total,
                page: pageNumber,
                limit: limitNumber,
                totalPages: Math.ceil(total / limitNumber)
            }
        }
    };
};

export const createProductService = async (data) => {

    const category = await Category.findById(
        data.category
    ).lean();

    if (!category) {
        throw new Error("Category not found");
    }

    const subcategory = await SubCategory.findById(
        data.subcategory
    ).lean();

    if (!subcategory) {
        throw new Error("Subcategory not found");
    }

    if (
        subcategory.category.toString() !==
        data.category.toString()
    ) {
        throw new Error(
            "Subcategory does not belong to this category"
        );
    }

    let sortOrder = data.sortOrder;

    if (!sortOrder) {

        const lastProduct = await Product.findOne()
            .sort({ sortOrder: -1 })
            .select("sortOrder")
            .lean();

        sortOrder = lastProduct
            ? lastProduct.sortOrder + 1
            : 1;

    } else {

        sortOrder = Number(sortOrder);

        if (!Number.isInteger(sortOrder) || sortOrder < 1) {
            throw new Error(
                "sortOrder must be a positive integer"
            );
        }

        await Product.updateMany(
            {
                sortOrder: {
                    $gte: sortOrder
                }
            },
            {
                $inc: {
                    sortOrder: 1
                }
            }
        );
    }

    data.sortOrder = sortOrder;

    const product = await Product.create(data);

    return {
        message: "Product created successfully",
        data: {
            product
        }
    };
};

/**
 * Full product page payload:
 * product + specs + media + options (with values) + price slabs
 */
export const getProductByIdService = async (id) => {

    const product = await Product.findById(id)
        .populate("category", "name slug")
        .populate("subcategory", "name slug")
        .lean();

    if (!product) {
        throw httpError(404, "Product not found");
    }

    const [specs, media, options, priceSlabs] = await Promise.all([

        ProductSpec.find({ product: id })
            .sort({ sortOrder: 1 })
            .lean(),

        ProductMedia.find({ product: id })
            .sort({ isPrimary: -1, sortOrder: 1 })
            .lean(),

        ProductOption.find({ product: id })
            .sort({ createdAt: 1 })
            .lean(),

        PriceSlab.find({ product: id })
            .sort({ minQty: 1 })
            .lean()
    ]);

    const optionIds = options.map((option) => option._id);

    const optionValues = optionIds.length
        ? await ProductOptionValue.find({
            option: { $in: optionIds }
        })
            .sort({ sortOrder: 1 })
            .lean()
        : [];

    const optionsWithValues = options.map((option) => ({
        ...option,
        values: optionValues.filter(
            (value) =>
                value.option.toString() === option._id.toString()
        )
    }));

    return {
        message: "Product fetched successfully",
        data: {
            product,
            specs,
            media,
            options: optionsWithValues,
            priceSlabs
        }
    };
};

export const updateProductService = async (id, data) => {

    const existing = await Product.findById(id).lean();

    if (!existing) {
        throw httpError(404, "Product not found");
    }

    if (data.sku) {

        const sku = String(data.sku).trim().toUpperCase();

        const skuTaken = await Product.findOne({
            sku,
            _id: { $ne: id }
        }).lean();

        if (skuTaken) {
            throw httpError(409, "SKU already exists");
        }

        data.sku = sku;
    }

    if (data.slug) {

        const slug = String(data.slug).trim().toLowerCase();

        const slugTaken = await Product.findOne({
            slug,
            _id: { $ne: id }
        }).lean();

        if (slugTaken) {
            throw httpError(409, "Slug already exists");
        }

        data.slug = slug;
    }

    if (data.category || data.subcategory) {

        const categoryId = data.category || existing.category;
        const subcategoryId =
            data.subcategory || existing.subcategory;

        const category = await Category.findById(categoryId).lean();

        if (!category) {
            throw httpError(404, "Category not found");
        }

        const subcategory = await SubCategory.findById(
            subcategoryId
        ).lean();

        if (!subcategory) {
            throw httpError(404, "Subcategory not found");
        }

        if (
            subcategory.category.toString() !==
            category._id.toString()
        ) {
            throw httpError(
                400,
                "Subcategory does not belong to this category"
            );
        }

        data.category = category._id;
        data.subcategory = subcategory._id;
    }

    if (data.sortOrder !== undefined) {

        const sortOrder = Number(data.sortOrder);

        if (!Number.isInteger(sortOrder) || sortOrder < 1) {
            throw httpError(
                400,
                "sortOrder must be a positive integer"
            );
        }

        if (sortOrder !== existing.sortOrder) {

            await Product.updateMany(
                {
                    _id: { $ne: id },
                    sortOrder: { $gte: sortOrder }
                },
                {
                    $inc: { sortOrder: 1 }
                }
            );
        }

        data.sortOrder = sortOrder;
    }

    const product = await Product.findByIdAndUpdate(id, data, {
        new: true,
        runValidators: true
    });

    return {
        message: "Product updated successfully",
        data: {
            product
        }
    };
};

/**
 * Deleting a product removes every child row it owns and every
 * cloudinary asset attached to it.
 */
export const deleteProductService = async (id) => {

    const product = await Product.findById(id).lean();

    if (!product) {
        throw httpError(404, "Product not found");
    }

    const media = await ProductMedia.find({ product: id }).lean();

    for (const item of media) {
        try {
            await destroyFromCloudinary(item.publicId, item.type);
        } catch (error) {
            console.error(
                `Cloudinary delete failed for ${item.publicId}: ${error.message}`
            );
        }
    }

    const options = await ProductOption.find({ product: id })
        .select("_id")
        .lean();

    const optionIds = options.map((option) => option._id);

    await Promise.all([
        ProductSpec.deleteMany({ product: id }),
        ProductMedia.deleteMany({ product: id }),
        PriceSlab.deleteMany({ product: id }),
        ProductOption.deleteMany({ product: id }),
        ProductOptionValue.deleteMany({
            option: { $in: optionIds }
        })
    ]);

    await Product.findByIdAndDelete(id);

    return {
        message: "Product deleted successfully",
        data: {
            product
        }
    };
};