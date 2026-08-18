import fs from "fs/promises";
import path from "path";
import Product from "../models/product.model.js";
import ProductMedia from "../models/productMedia.model.js";
import { httpError } from "../utils/httpError.js";
import {
    resolveMediaType,
    uploadFileToCloudinary
} from "../utils/cloudinaryUpload.js";

/**
 * MUG001.jpg     -> MUG001
 * MUG001-2.jpg   -> MUG001
 * MUG001_3.mp4   -> MUG001
 * mug001 (1).jpg -> MUG001
 */
export const extractSkuFromFilename = (fileName = "") => {

    const base = path.basename(
        fileName,
        path.extname(fileName)
    );

    const sku = base.split(/[-_\s(]/)[0];

    return sku ? sku.trim().toUpperCase() : "";
};

/* ------------------------------------------------------------------
   1. API SIDE
------------------------------------------------------------------ */

export const runBulkMediaService = async (uploadedFiles, batchDir) => {

    if (!uploadedFiles || !uploadedFiles.length) {
        throw httpError(400, "At least one media file is required");
    }

    const result = await processBulkMedia(
        uploadedFiles.map((file) => ({
            path: file.path,
            originalName: file.originalname,
            mimetype: file.mimetype
        })),
        batchDir
    );

    return {
        message: "Bulk media upload completed",
        data: result
    };
};

/* ------------------------------------------------------------------
   2. PROCESSING
   Kept standalone so it can be moved onto a queue later without
   touching any of the logic below.
------------------------------------------------------------------ */

export const processBulkMedia = async (files, batchDir) => {

    const total = files.length;

    const productCache = new Map();
    const sortOrderCache = new Map();
    const hasPrimaryCache = new Map();

    const errors = [];
    let success = 0;

    for (let index = 0; index < files.length; index += 1) {

        const file = files[index];

        try {

            const sku = extractSkuFromFilename(file.originalName);

            if (!sku) {
                throw new Error(
                    "Could not read a SKU from the filename"
                );
            }

            const mediaType =
                resolveMediaType(file.mimetype) ||
                resolveMediaType(file.originalName);

            if (!mediaType) {
                throw new Error("Unsupported file type");
            }

            let product = productCache.get(sku);

            if (product === undefined) {

                product = await Product.findOne({ sku })
                    .select("_id")
                    .lean();

                productCache.set(sku, product);
            }

            // bulk media never creates a product
            if (!product) {
                throw new Error(`No product found with SKU "${sku}"`);
            }

            const productId = String(product._id);

            if (!sortOrderCache.has(productId)) {

                const last = await ProductMedia.findOne({
                    product: product._id
                })
                    .sort({ sortOrder: -1 })
                    .select("sortOrder")
                    .lean();

                sortOrderCache.set(
                    productId,
                    last ? last.sortOrder + 1 : 1
                );

                const primary = await ProductMedia.findOne({
                    product: product._id,
                    isPrimary: true
                })
                    .select("_id")
                    .lean();

                hasPrimaryCache.set(productId, Boolean(primary));
            }

            const uploaded = await uploadFileToCloudinary(
                file.path,
                mediaType
            );

            const isPrimary =
                mediaType === "IMAGE" &&
                !hasPrimaryCache.get(productId);

            await ProductMedia.create({
                product: product._id,
                type: mediaType,
                url: uploaded.url,
                provider: "cloudinary",
                publicId: uploaded.publicId,
                posterUrl: uploaded.posterUrl,
                altText: "",
                sortOrder: sortOrderCache.get(productId),
                isPrimary
            });

            if (isPrimary) {
                hasPrimaryCache.set(productId, true);
            }

            sortOrderCache.set(
                productId,
                sortOrderCache.get(productId) + 1
            );

            success += 1;

        } catch (error) {

            errors.push({
                file: file.originalName,
                sku: extractSkuFromFilename(file.originalName),
                message: error.message
            });
        }

        await fs.unlink(file.path).catch(() => { });
    }

    if (batchDir) {
        await fs.rm(batchDir, { recursive: true, force: true })
            .catch(() => { });
    }

    return {
        total,
        processed: total,
        success,
        failed: errors.length,
        errors
    };
};
