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
import mongoose from "mongoose";
import Order from "../models/order.model.js";

import OrderItem from "../models/orderItem.model.js";

/*
 * The storefront cards need a thumbnail and media lives in its own
 * collection. One extra query for the whole list beats an N+1 per card.
 */

const attachPrimaryMedia = async (products) => {

    if (!products.length) {
        return products;
    }

    const media = await ProductMedia.find({
        product: {
            $in: products.map(
                (item) => item._id
            )
        }
    })
        .sort({ isPrimary: -1, sortOrder: 1 })
        .lean();

    const primaryByProduct = new Map();

    for (const item of media) {
        const key = String(item.product);

        if (!primaryByProduct.has(key)) {
            primaryByProduct.set(key, item);
        }
    }

    return products.map((product) => ({
        ...product,
        primaryMedia:
            primaryByProduct.get(String(product._id)) || null
    }));
};

export const getProductsService = async (query) => {

    const {
        page = 1,
        limit = 10,
        search,
        category,
        subcategory,
        status,
        sort,
        minPrice,
        maxPrice
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

    // Price range filter
    if (minPrice !== undefined || maxPrice !== undefined) {
        filter.basePrice = {};

        if (minPrice !== undefined) {
            filter.basePrice.$gte = Number(minPrice);
        }

        if (maxPrice !== undefined) {
            filter.basePrice.$lte = Number(maxPrice);
        }
    }

    const pageNumber = Number(page);
    const limitNumber = Number(limit);

    const skip = (pageNumber - 1) * limitNumber;

    let sortOption = { sortOrder: 1 };

    if (sort === "price_asc") {
        sortOption = { basePrice: 1 };
    }

    if (sort === "price_desc") {
        sortOption = { basePrice: -1 };
    }

    const products = await Product.find(filter)
        .populate("category", "name slug")
        .populate("subcategory", "name slug")
        .sort(sortOption)
        .skip(skip)
        .limit(limitNumber)
        .lean();

    const total = await Product.countDocuments(filter);

    const productsWithMedia = await attachPrimaryMedia(products);

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


export const getSuggestedProductsService = async (id, query) => {

    const {
        limit = 8
    } = query;

    const limitNumber = Math.min(
        Math.max(Number(limit), 1),
        20
    );

    const product = await Product.findById(id)
        .select("_id category subcategory")
        .lean();

    if (!product) {
        throw httpError(404, "Product not found");
    }

    /*
     * First priority
     * Same category + same subcategory
     */

    const sameSubcategory = await Product.find({
        _id: { $ne: product._id },
        category: product.category,
        subcategory: product.subcategory,
        status: "PUBLISHED"
    })
        .populate("category", "name slug")
        .populate("subcategory", "name slug")
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(limitNumber)
        .lean();

    /*
     * If enough products are available
     */

    if (sameSubcategory.length >= limitNumber) {

        return {
            message: "Suggested products fetched successfully",
            data: {
                products: await attachPrimaryMedia(
                    sameSubcategory
                )
            }
        };

    }

    /*
     * If same subcategory does not have enough products,
     * get remaining products from the same category.
     */

    const existingIds = [
        product._id,
        ...sameSubcategory.map(
            (item) => item._id
        )
    ];

    const remainingLimit =
        limitNumber - sameSubcategory.length;

    const sameCategory = await Product.find({
        _id: {
            $nin: existingIds
        },
        category: product.category,
        status: "PUBLISHED"
    })
        .populate("category", "name slug")
        .populate("subcategory", "name slug")
        .sort({ sortOrder: 1, createdAt: -1 })
        .limit(remainingLimit)
        .lean();

    const products = [
        ...sameSubcategory,
        ...sameCategory
    ];

    return {
        message: "Suggested products fetched successfully",
        data: {
            products: await attachPrimaryMedia(products)
        }
    };
};

export const getBestSellerProductsService = async (query) => {

    const {
        limit = 6
    } = query;

    const limitNumber = Math.min(
        Math.max(Number(limit) || 6, 1),
        20
    );

    const bestSellers = await OrderItem.aggregate([

        /*
         * Only use paid orders
         */
        {
            $lookup: {
                from: "orders",
                localField: "order",
                foreignField: "_id",
                as: "order"
            }
        },

        {
            $unwind: "$order"
        },

        /*
         * Only PAID orders
         */
        {
            $match: {
                "order.status": "PAID"
            }
        },

        /*
         * Group by product
         */
        {
            $group: {
                _id: "$product",
                totalSold: {
                    $sum: "$qty"
                }
            }
        },

        /*
         * Highest quantity sold first
         */
        {
            $sort: {
                totalSold: -1
            }
        },

        /*
         * Get only required products
         */
        {
            $limit: limitNumber
        },

        /*
         * Get product information
         */
        {
            $lookup: {
                from: "products",
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },

        {
            $unwind: "$product"
        },

        /*
         * Only published products
         */
        {
            $match: {
                "product.status": "PUBLISHED"
            }
        },

        /*
         * Return product + sold quantity
         */
        {
            $project: {
                _id: "$product._id",
                name: "$product.name",
                slug: "$product.slug",
                sku: "$product.sku",
                category: "$product.category",
                subcategory: "$product.subcategory",
                shortDescription: "$product.shortDescription",
                basePrice: "$product.basePrice",
                taxRate: "$product.taxRate",
                leadTimeDays: "$product.leadTimeDays",
                isCustomisable: "$product.isCustomisable",
                customisationType: "$product.customisationType",
                minQty: "$product.minQty",
                status: "$product.status",
                sortOrder: "$product.sortOrder",
                totalSold: 1
            }
        }

    ]);

    /*
     * The pipeline carries category and subcategory as ids. The storefront
     * cards print their names, so they are resolved here — and the
     * thumbnail is attached the same way every other list gets one.
     */

    const withCategories = await Product.populate(bestSellers, [
        {
            path: "category",
            select: "name slug"
        },
        {
            path: "subcategory",
            select: "name slug"
        }
    ]);

    return {
        message: "Best seller products fetched successfully",
        data: {
            products: await attachPrimaryMedia(withCategories)
        }
    };
};