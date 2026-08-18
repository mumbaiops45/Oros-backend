import path from "path";
import { getCloudinary } from "../config/cloudinary.js";

export const IMAGE_EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
export const VIDEO_EXTENSIONS = ["mp4", "mov", "webm"];

/**
 * Decide IMAGE / VIDEO from a filename or a mimetype.
 * Returns null when the file is not a supported media file.
 */
export const resolveMediaType = (fileNameOrMime = "") => {

    const value = String(fileNameOrMime).toLowerCase();

    if (value.startsWith("image/")) {
        return "IMAGE";
    }

    if (value.startsWith("video/")) {
        return "VIDEO";
    }

    const extension = path
        .extname(value)
        .replace(".", "");

    if (IMAGE_EXTENSIONS.includes(extension)) {
        return "IMAGE";
    }

    if (VIDEO_EXTENSIONS.includes(extension)) {
        return "VIDEO";
    }

    return null;
};

export const resourceTypeFor = (mediaType) => {
    return mediaType === "VIDEO" ? "video" : "image";
};

/**
 * Poster frame for a video. Cloudinary renders a jpg from the
 * first frame when the video public id is requested as .jpg
 */
export const buildPosterUrl = (publicId) => {

    if (!publicId) {
        return "";
    }

    return getCloudinary().url(`${publicId}.jpg`, {
        resource_type: "video",
        secure: true
    });
};

/**
 * Used by bulk media (files sit on disk, not in a multer
 * cloudinary stream).
 */
export const uploadFileToCloudinary = async (
    filePath,
    mediaType,
    folder = "oros/product"
) => {

    const result = await getCloudinary().uploader.upload(
        filePath,
        {
            folder,
            resource_type: resourceTypeFor(mediaType)
        }
    );

    return {
        url: result.secure_url,
        publicId: result.public_id,
        posterUrl:
            mediaType === "VIDEO"
                ? buildPosterUrl(result.public_id)
                : ""
    };
};

export const destroyFromCloudinary = async (
    publicId,
    mediaType = "IMAGE"
) => {

    if (!publicId) {
        return;
    }

    await getCloudinary().uploader.destroy(publicId, {
        resource_type: resourceTypeFor(mediaType)
    });
};
