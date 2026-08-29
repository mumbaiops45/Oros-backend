import fs from "fs";
import path from "path";
import multer from "multer";
import { randomUUID } from "crypto";
import { getCloudinary } from "../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import {
    IMAGE_EXTENSIONS,
    VIDEO_EXTENSIONS,
    resolveMediaType
} from "../utils/cloudinaryUpload.js";

/* ------------------------------------------------------------------
   EXISTING UPLOADERS - DO NOT CHANGE
   category / subcategory behaviour stays exactly as it was
------------------------------------------------------------------ */

const createUpload = (folder) => {
    const storage = new CloudinaryStorage({
        cloudinary: getCloudinary(),
        params: {
            folder,
            allowed_formats: ["jpg", "jpeg", "png", "webp", "mp4","mov","webm"],
        }
    })
    return multer({ storage })
}

export const categoryUpload = createUpload("oros/category");
export const productUpload = createUpload("oros/product");
export const subCategoryUpload = createUpload("oros/product");
export const bannerUpload =createUpload("oros/banner");

const quotationStorage = new CloudinaryStorage({
    cloudinary: getCloudinary(),
    params: {
        folder: "oros/quotation",
        resource_type: "auto"
    }
});

export const quotationUpload = multer({
    storage: quotationStorage
});

/* ------------------------------------------------------------------
   NEW: PRODUCT MEDIA (image + video) -> straight to cloudinary
   used by the normal single media API
------------------------------------------------------------------ */

const productMediaStorage = new CloudinaryStorage({
    cloudinary: getCloudinary(),
    params: async (req, file) => {

        const isVideo = file.mimetype.startsWith("video/");

        return {
            folder: "oros/product",
            resource_type: isVideo ? "video" : "image",
            allowed_formats: isVideo
                ? VIDEO_EXTENSIONS
                : IMAGE_EXTENSIONS
        };
    }
});

const mediaFileFilter = (req, file, cb) => {

    const type =
        resolveMediaType(file.mimetype) ||
        resolveMediaType(file.originalname);

    if (!type) {
        return cb(
            new Error(
                "Only jpg, jpeg, png, webp, mp4, mov, webm files are allowed"
            )
        );
    }

    cb(null, true);
};

export const productMediaUpload = multer({
    storage: productMediaStorage,
    fileFilter: mediaFileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024
    }
});

/* ------------------------------------------------------------------
   NEW: BULK UPLOADS -> temp disk, then processed and cleaned up
------------------------------------------------------------------ */

const ensureDir = (dir) => {
    fs.mkdirSync(dir, { recursive: true });
    return dir;
};

export const BULK_IMPORT_DIR = path.resolve("uploads/bulk-import");
export const BULK_MEDIA_DIR = path.resolve("uploads/bulk-media");

const bulkImportStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, ensureDir(BULK_IMPORT_DIR));
    },
    filename: (req, file, cb) => {
        cb(
            null,
            `${randomUUID()}${path.extname(file.originalname)}`
        );
    }
});

export const bulkImportUpload = multer({
    storage: bulkImportStorage,
    fileFilter: (req, file, cb) => {

        const extension = path
            .extname(file.originalname)
            .toLowerCase();

        if (![".csv", ".xlsx", ".xls"].includes(extension)) {
            return cb(
                new Error("Only .csv, .xlsx or .xls files are allowed")
            );
        }

        cb(null, true);
    },
    limits: {
        fileSize: 20 * 1024 * 1024
    }
});

const bulkMediaStorage = multer.diskStorage({
    destination: (req, file, cb) => {

        if (!req.bulkBatchId) {
            req.bulkBatchId = randomUUID();
        }

        cb(
            null,
            ensureDir(path.join(BULK_MEDIA_DIR, req.bulkBatchId))
        );
    },
    filename: (req, file, cb) => {
        // stored name is random, the real filename travels in the job
        // payload as originalName and is what the SKU is read from
        cb(
            null,
            `${randomUUID()}${path.extname(file.originalname)}`
        );
    }
});

export const bulkMediaUpload = multer({
    storage: bulkMediaStorage,
    fileFilter: mediaFileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024
    }
});
