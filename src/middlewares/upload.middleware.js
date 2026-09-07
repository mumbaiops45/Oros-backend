import fs from "fs";
import os from "os";
import path from "path";
import multer from "multer";
import { randomUUID } from "crypto";
import { DeleteObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { getCloudinary } from "../config/cloudinary.js";
import { CloudinaryStorage } from "multer-storage-cloudinary";
import {
    getObjectStore,
    isObjectStoreConfigured,
    OBJECT_STORE_BUCKET,
    MODEL_KEY_PREFIX
} from "../config/objectStore.js";
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
export const profileUpload = createUpload("oros/profile");

const ALLOWED_3D_FORMATS = [
    ".stl",
    ".obj",
    ".step",
    ".stp",
    ".3mf",
    ".iges",
    ".igs"
];

/* ------------------------------------------------------------------
   3D model storage

   Cloudinary's free plan refuses any single asset over 10 MB
   ("File size too large. Got X. Maximum is 10485760.") - and that is
   an account-level limit on the finished asset, so chunking the
   transfer does NOT get past it. 3D models routinely run larger.

   When an S3-compatible bucket is configured (S3_* env vars - see
   config/objectStore.js) models go there instead, with no size cap.
   Otherwise we fall back to Cloudinary chunked upload, which still
   works for models under 10 MB.
------------------------------------------------------------------ */

// ── S3-compatible storage (R2 / S3 / B2) ──────────────────────────
class S3ModelStorage {

    _handleFile(req, file, cb) {

        const id =
            `${randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
        const key = `${MODEL_KEY_PREFIX}${id}`;

        const upload = new Upload({
            client: getObjectStore(),
            params: {
                Bucket: OBJECT_STORE_BUCKET,
                Key: key,
                Body: file.stream,
                ContentType: file.mimetype || "application/octet-stream",
                Metadata: {
                    originalname: encodeURIComponent(file.originalname)
                }
            }
        });

        // progress events carry the running byte count - multer doesn't
        // set file.size for a custom engine, so report it ourselves
        let bytes = 0;
        upload.on("httpUploadProgress", (progress) => {
            if (progress.loaded) {
                bytes = progress.loaded;
            }
        });

        upload
            .done()
            .then(() => {

                const base =
                    process.env.SERVER_PUBLIC_URL ||
                    `${req.protocol}://${req.get("host")}`;

                cb(null, {
                    // the client links straight to this; the route below
                    // presigns the bucket object and redirects
                    path: `${base}/api/quotation/files/${id}`,
                    key,
                    filename: id,
                    size: bytes
                });
            })
            .catch(cb);
    }

    _removeFile(req, file, cb) {

        getObjectStore()
            .send(
                new DeleteObjectCommand({
                    Bucket: OBJECT_STORE_BUCKET,
                    Key: file.key
                })
            )
            .then(() => cb(null))
            .catch(cb);
    }
}

// ── Cloudinary chunked fallback (only useful for models < 10 MB) ───
// must stay below Cloudinary's per-request limit; 6 MB keeps a margin
// under the 10 MB free-plan cap
const MODEL_CHUNK_SIZE = 6 * 1024 * 1024;

class CloudinaryChunkedStorage {

    constructor({ folder }) {
        this.folder = folder;
    }

    _handleFile(req, file, cb) {

        const tmpPath = path.join(
            os.tmpdir(),
            `oros-3d-${randomUUID()}${path.extname(file.originalname)}`
        );

        const sink = fs.createWriteStream(tmpPath);

        sink.on("error", cb);

        file.stream.on("error", (err) => {
            sink.destroy();
            fs.unlink(tmpPath, () => cb(err));
        });

        sink.on("finish", () => {

            // cloudinary.v2 signature is upload_large(path, options,
            // callback). The `chunk_size` option is what actually splits
            // the upload into sub-10-MB requests - without it the SDK
            // default (20 MB) sends smaller files in one shot and
            // Cloudinary answers "File size too large. Got X. Maximum is
            // 10485760." on the free plan.
            getCloudinary().uploader.upload_large(
                tmpPath,
                {
                    folder: this.folder,
                    resource_type: "raw",
                    use_filename: true,
                    unique_filename: true,
                    chunk_size: MODEL_CHUNK_SIZE
                },
                (err, result) => {

                    fs.unlink(tmpPath, () => {});

                    if (err || !result) {
                        return cb(
                            err ||
                            new Error("Upload failed")
                        );
                    }

                    cb(null, {
                        path: result.secure_url,
                        filename: result.public_id,
                        size: result.bytes
                    });
                }
            );
        });

        file.stream.pipe(sink);
    }

    _removeFile(req, file, cb) {

        getCloudinary().uploader.destroy(
            file.filename,
            { resource_type: "raw" },
            cb
        );
    }
}

const storage = isObjectStoreConfigured
    ? new S3ModelStorage()
    : new CloudinaryChunkedStorage({ folder: "oros/3d-models" });

const fileFilter = (req, file, cb) => {

    const extension = file.originalname
        .toLowerCase()
        .slice(file.originalname.lastIndexOf("."));

    if (!ALLOWED_3D_FORMATS.includes(extension)) {
        return cb(
            new Error("Only 3D model files are allowed"),
            false
        );
    }

    cb(null, true);
};

export const quotationUpload = multer({
    storage,
    fileFilter,

    limits: {
        fileSize: 100 * 1024 * 1024
    }
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
