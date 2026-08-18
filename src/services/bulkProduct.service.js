import fs from "fs/promises";
import XLSX from "xlsx";
import Product from "../models/product.model.js";
import Category from "../models/category.model.js";
import SubCategory from "../models/subCategory.model.js";
import ProductSpec from "../models/productSpec.model.js";
import ProductOption from "../models/productOption.model.js";
import ProductOptionValue from "../models/productOptionValue.model.js";
import PriceSlab from "../models/priceSlab.model.js";
import { httpError } from "../utils/httpError.js";
import {
    parseSheet,
    cell,
    toNumber,
    toBoolean,
    parseJsonArray
} from "../utils/sheet.js";

const OPTION_TYPES = ["SELECT", "TEXT", "COLOR", "FILE"];

const TEMPLATE_COLUMNS = [
    "sku",
    "name",
    "slug",
    "category",
    "subcategory",
    "short_description",
    "long_description",
    "base_price",
    "tax_rate",
    "lead_time_days",
    "customisable",
    "min_qty",
    "seo_title",
    "seo_description",
    "specs",
    "options",
    "price_slabs"
];

const escapeRegex = (value) => {
    return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
};

/* ------------------------------------------------------------------
   1. API SIDE
------------------------------------------------------------------ */

export const runBulkImportService = async (file) => {

    if (!file) {
        throw httpError(400, "A .csv or .xlsx file is required");
    }

    const result = await processBulkImport(file.path);

    return {
        message: "Bulk product import completed",
        data: {
            fileName: file.originalname,
            ...result
        }
    };
};

/**
 * Downloadable template so the admin knows the exact columns.
 */
export const buildImportTemplateBuffer = () => {

    const sample = {
        sku: "MUG001",
        name: "Custom 3D Printed Mug",
        slug: "custom-3d-printed-mug",
        category: "Home Decor",
        subcategory: "Mugs",
        short_description: "A made to order printed mug",
        long_description: "Printed after the order is placed.",
        base_price: 499,
        tax_rate: 18,
        lead_time_days: 5,
        customisable: "TRUE",
        min_qty: 1,
        seo_title: "Custom 3D Printed Mug",
        seo_description: "Buy a custom 3D printed mug",
        specs: JSON.stringify([
            { label: "Material", value: "PLA" },
            { label: "Height", value: "100mm" }
        ]),
        options: JSON.stringify([
            {
                name: "Size",
                type: "SELECT",
                isRequired: true,
                values: [
                    { value: "Small", priceDelta: 0, priceMultiplier: 1 },
                    { value: "Large", priceDelta: 100, priceMultiplier: 1 }
                ]
            }
        ]),
        price_slabs: JSON.stringify([
            { minQty: 1, maxQty: 9, unitPrice: 499 },
            { minQty: 10, maxQty: 49, unitPrice: 450 }
        ])
    };

    const sheet = XLSX.utils.json_to_sheet([sample], {
        header: TEMPLATE_COLUMNS
    });

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, sheet, "products");

    return XLSX.write(workbook, {
        type: "buffer",
        bookType: "xlsx"
    });
};

/* ------------------------------------------------------------------
   2. PROCESSING - validation + creation, one row at a time
------------------------------------------------------------------ */

const resolveCategory = async (name, cache) => {

    const key = name.toLowerCase();

    if (cache.has(key)) {
        return cache.get(key);
    }

    const category = await Category.findOne({
        name: {
            $regex: `^${escapeRegex(name)}$`,
            $options: "i"
        }
    })
        .select("_id name")
        .lean();

    cache.set(key, category);

    return category;
};

const resolveSubCategory = async (name, categoryId, cache) => {

    const key = `${categoryId}:${name.toLowerCase()}`;

    if (cache.has(key)) {
        return cache.get(key);
    }

    // looked up by name only, so that "belongs to category" stays a
    // real validation error instead of a silent "not found"
    const subcategory = await SubCategory.findOne({
        name: {
            $regex: `^${escapeRegex(name)}$`,
            $options: "i"
        }
    })
        .select("_id name category")
        .lean();

    cache.set(key, subcategory);

    return subcategory;
};

const validateRow = async (row, context) => {

    const sku = String(cell(row, "sku")).trim().toUpperCase();

    if (!sku) {
        throw new Error("sku is required");
    }

    const name = cell(row, "name");

    if (!name) {
        throw new Error("name is required");
    }

    const slug = String(cell(row, "slug")).trim().toLowerCase();

    if (!slug) {
        throw new Error("slug is required");
    }

    if (context.seenSku.has(sku)) {
        throw new Error(`Duplicate sku "${sku}" inside the file`);
    }

    if (context.seenSlug.has(slug)) {
        throw new Error(`Duplicate slug "${slug}" inside the file`);
    }

    const existing = await Product.findOne({
        $or: [{ sku }, { slug }]
    })
        .select("sku slug")
        .lean();

    if (existing) {
        throw new Error(
            existing.sku === sku
                ? `sku "${sku}" already exists`
                : `slug "${slug}" already exists`
        );
    }

    const categoryName = cell(row, "category", "category_name");

    if (!categoryName) {
        throw new Error("category is required");
    }

    const category = await resolveCategory(
        categoryName,
        context.categoryCache
    );

    if (!category) {
        throw new Error(`Category "${categoryName}" not found`);
    }

    const subcategoryName = cell(
        row,
        "subcategory",
        "sub_category",
        "subcategory_name"
    );

    if (!subcategoryName) {
        throw new Error("subcategory is required");
    }

    const subcategory = await resolveSubCategory(
        subcategoryName,
        category._id,
        context.subCategoryCache
    );

    if (!subcategory) {
        throw new Error(`Subcategory "${subcategoryName}" not found`);
    }

    if (
        subcategory.category.toString() !== category._id.toString()
    ) {
        throw new Error(
            `Subcategory "${subcategoryName}" does not belong to category "${categoryName}"`
        );
    }

    const basePrice = toNumber(cell(row, "base_price", "basePrice"));

    if (basePrice === null || Number.isNaN(basePrice) || basePrice < 0) {
        throw new Error("base_price must be a number of 0 or more");
    }

    const taxRate = toNumber(cell(row, "tax_rate", "taxRate"), 0);

    if (Number.isNaN(taxRate) || taxRate < 0) {
        throw new Error("tax_rate must be a positive number");
    }

    const leadTimeDays = toNumber(
        cell(row, "lead_time_days", "leadTimeDays")
    );

    if (
        leadTimeDays === null ||
        Number.isNaN(leadTimeDays) ||
        leadTimeDays < 0
    ) {
        throw new Error(
            "lead_time_days must be a number of 0 or more"
        );
    }

    const minQty = toNumber(cell(row, "min_qty", "minQty"), 1);

    if (Number.isNaN(minQty) || minQty < 1) {
        throw new Error("min_qty must be a number of 1 or more");
    }

    const isCustomisable = toBoolean(
        cell(row, "customisable", "is_customisable", "isCustomisable"),
        false
    );

    if (isCustomisable === null) {
        throw new Error(
            "customisable must be TRUE or FALSE"
        );
    }

    const specs = parseJsonArray(
        cell(row, "specs"),
        "specs"
    ).map((spec, index) => {

        if (!spec?.label || !spec?.value) {
            throw new Error(
                "each spec needs a label and a value"
            );
        }

        return {
            label: String(spec.label),
            value: String(spec.value),
            sortOrder: Number(spec.sortOrder) || index + 1
        };
    });

    const options = parseJsonArray(
        cell(row, "options"),
        "options"
    ).map((option) => {

        if (!option?.name) {
            throw new Error("each option needs a name");
        }

        const type = String(option.type || "").toUpperCase();

        if (!OPTION_TYPES.includes(type)) {
            throw new Error(
                `option "${option.name}" type must be one of ${OPTION_TYPES.join(", ")}`
            );
        }

        const values = Array.isArray(option.values)
            ? option.values
            : [];

        return {
            name: String(option.name),
            type,
            isRequired: Boolean(option.isRequired),
            values: values.map((value, index) => {

                if (!value?.value) {
                    throw new Error(
                        `option "${option.name}" has a value without "value"`
                    );
                }

                return {
                    value: String(value.value),
                    priceDelta: Number(value.priceDelta) || 0,
                    priceMultiplier:
                        value.priceMultiplier === undefined
                            ? 1
                            : Number(value.priceMultiplier),
                    sortOrder: Number(value.sortOrder) || index + 1
                };
            })
        };
    });

    const priceSlabs = parseJsonArray(
        cell(row, "price_slabs", "priceSlabs"),
        "price_slabs"
    ).map((slab) => {

        const min = Number(slab?.minQty);
        const max =
            slab?.maxQty === undefined ||
                slab?.maxQty === null ||
                slab?.maxQty === ""
                ? null
                : Number(slab.maxQty);
        const unitPrice = Number(slab?.unitPrice);

        if (!Number.isFinite(min) || min < 1) {
            throw new Error("price slab minQty must be 1 or more");
        }

        if (max !== null && (!Number.isFinite(max) || max < min)) {
            throw new Error(
                "price slab maxQty must be empty or >= minQty"
            );
        }

        if (!Number.isFinite(unitPrice) || unitPrice < 0) {
            throw new Error(
                "price slab unitPrice must be a positive number"
            );
        }

        return { minQty: min, maxQty: max, unitPrice };
    });

    return {
        sku,
        productData: {
            sku,
            name,
            slug,
            category: category._id,
            subcategory: subcategory._id,
            shortDescription: cell(
                row,
                "short_description",
                "shortDescription"
            ),
            longDescription: cell(
                row,
                "long_description",
                "longDescription"
            ),
            basePrice,
            taxRate,
            leadTimeDays,
            isCustomisable,
            minQty,
            seoTitle: cell(row, "seo_title", "seoTitle"),
            seoDescription: cell(
                row,
                "seo_description",
                "seoDescription"
            ),
            // bulk imported products are always drafts
            status: "DRAFT",
            sortOrder: context.sortOrder
        },
        specs,
        options,
        priceSlabs
    };
};

const createRow = async (parsed) => {

    const product = await Product.create(parsed.productData);

    try {

        if (parsed.specs.length) {
            await ProductSpec.insertMany(
                parsed.specs.map((spec) => ({
                    ...spec,
                    product: product._id
                }))
            );
        }

        for (const option of parsed.options) {

            const created = await ProductOption.create({
                product: product._id,
                name: option.name,
                type: option.type,
                isRequired: option.isRequired
            });

            if (option.values.length) {
                await ProductOptionValue.insertMany(
                    option.values.map((value) => ({
                        ...value,
                        option: created._id
                    }))
                );
            }
        }

        if (parsed.priceSlabs.length) {
            await PriceSlab.insertMany(
                parsed.priceSlabs.map((slab) => ({
                    ...slab,
                    product: product._id
                }))
            );
        }

    } catch (error) {

        // never leave a half built product behind
        const options = await ProductOption.find({
            product: product._id
        })
            .select("_id")
            .lean();

        await Promise.all([
            ProductSpec.deleteMany({ product: product._id }),
            PriceSlab.deleteMany({ product: product._id }),
            ProductOption.deleteMany({ product: product._id }),
            ProductOptionValue.deleteMany({
                option: { $in: options.map((item) => item._id) }
            })
        ]);

        await Product.findByIdAndDelete(product._id);

        throw error;
    }

    return product;
};

/**
 * One bad row is reported and skipped, it never kills the import.
 * Kept as a standalone function so it can be moved onto a queue
 * later without touching any of the logic below.
 */
export const processBulkImport = async (filePath) => {

    const rows = parseSheet(filePath);
    const total = rows.length;

    const lastProduct = await Product.findOne()
        .sort({ sortOrder: -1 })
        .select("sortOrder")
        .lean();

    const context = {
        seenSku: new Set(),
        seenSlug: new Set(),
        categoryCache: new Map(),
        subCategoryCache: new Map(),
        sortOrder: lastProduct ? lastProduct.sortOrder + 1 : 1
    };

    const errors = [];
    let success = 0;

    for (let index = 0; index < rows.length; index += 1) {

        // +2 because row 1 is the header row in the sheet
        const rowNumber = index + 2;

        try {

            const parsed = await validateRow(rows[index], context);

            await createRow(parsed);

            context.seenSku.add(parsed.sku);
            context.seenSlug.add(parsed.productData.slug);
            context.sortOrder += 1;

            success += 1;

        } catch (error) {

            errors.push({
                row: rowNumber,
                sku: String(cell(rows[index], "sku") || ""),
                message: error.message
            });
        }
    }

    await fs.unlink(filePath).catch(() => { });

    return {
        total,
        processed: total,
        success,
        failed: errors.length,
        errors
    };
};
