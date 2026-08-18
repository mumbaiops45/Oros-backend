import mongoose from "mongoose";
import Product from "../models/product.model.js";
import ProductMedia from "../models/productMedia.model.js";
import { httpError } from "../utils/httpError.js";
import {
    resolveMediaType,
    buildPosterUrl,
    destroyFromCloudinary
} from "../utils/cloudinaryUpload.js";

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

export const nextMediaSortOrder = async (productId) => {

    const last = await ProductMedia.findOne({ product: productId })
        .sort({ sortOrder: -1 })
        .select("sortOrder")
        .lean();

    return last ? last.sortOrder + 1 : 1;
};

export const getMediaService = async (productId) => {

    await ensureProduct(productId);

    const media = await ProductMedia.find({ product: productId })
        .sort({ isPrimary: -1, sortOrder: 1 })
        .lean();

    return {
        message: "Product media fetched successfully",
        data: {
            media
        }
    };
};

/**
 * file  -> uploaded straight to cloudinary by productMediaUpload
 * body.url -> already hosted asset (streaming provider playback url)
 */
export const createMediaService = async (productId, file, body = {}) => {

    await ensureProduct(productId);

    let payload;

    if (file) {

        const type =
            resolveMediaType(file.mimetype) ||
            resolveMediaType(file.originalname);

        if (!type) {
            throw httpError(400, "Unsupported media type");
        }

        payload = {
            type,
            url: file.path,
            provider: "cloudinary",
            publicId: file.filename,
            posterUrl:
                type === "VIDEO"
                    ? body.posterUrl || buildPosterUrl(file.filename)
                    : body.posterUrl || ""
        };

    } else if (body.url) {

        const type = String(body.type || "").toUpperCase();

        if (!["IMAGE", "VIDEO"].includes(type)) {
            throw httpError(
                400,
                "type must be IMAGE or VIDEO when sending a url"
            );
        }

        payload = {
            type,
            url: body.url,
            provider: body.provider || "external",
            publicId: body.publicId || "",
            posterUrl: body.posterUrl || ""
        };

    } else {
        throw httpError(400, "A media file or a url is required");
    }

    const isPrimary =
        body.isPrimary === true ||
        body.isPrimary === "true" ||
        (await ProductMedia.countDocuments({
            product: productId
        })) === 0;

    if (isPrimary) {
        await ProductMedia.updateMany(
            { product: productId },
            { isPrimary: false }
        );
    }

    const media = await ProductMedia.create({
        product: productId,
        ...payload,
        altText: body.altText || "",
        sortOrder:
            body.sortOrder !== undefined
                ? Number(body.sortOrder)
                : await nextMediaSortOrder(productId),
        isPrimary
    });

    return {
        message: "Product media added successfully",
        data: {
            media
        }
    };
};

export const updateMediaService = async (
    productId,
    mediaId,
    data
) => {

    await ensureProduct(productId);

    const isPrimary =
        data.isPrimary === true || data.isPrimary === "true";

    if (isPrimary) {
        await ProductMedia.updateMany(
            { product: productId },
            { isPrimary: false }
        );
    }

    const media = await ProductMedia.findOneAndUpdate(
        {
            _id: mediaId,
            product: productId
        },
        {
            ...(data.altText !== undefined && {
                altText: data.altText
            }),
            ...(data.sortOrder !== undefined && {
                sortOrder: Number(data.sortOrder)
            }),
            ...(data.posterUrl !== undefined && {
                posterUrl: data.posterUrl
            }),
            ...(data.isPrimary !== undefined && { isPrimary })
        },
        {
            new: true,
            runValidators: true
        }
    );

    if (!media) {
        throw httpError(404, "Product media not found");
    }

    return {
        message: "Product media updated successfully",
        data: {
            media
        }
    };
};

export const deleteMediaService = async (productId, mediaId) => {

    await ensureProduct(productId);

    const media = await ProductMedia.findOneAndDelete({
        _id: mediaId,
        product: productId
    });

    if (!media) {
        throw httpError(404, "Product media not found");
    }

    if (media.provider === "cloudinary" && media.publicId) {
        try {
            await destroyFromCloudinary(media.publicId, media.type);
        } catch (error) {
            console.error(
                `Cloudinary delete failed for ${media.publicId}: ${error.message}`
            );
        }
    }

    return {
        message: "Product media deleted successfully",
        data: {
            media
        }
    };
};
