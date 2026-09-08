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


// ================================================================
// S3 compatible storage
// R2 / S3 / B2
// ================================================================

class S3ModelStorage {

    _handleFile(req, file, cb) {

        const extension = path
            .extname(file.originalname)
            .toLowerCase();

        const id = `${randomUUID()}${extension}`;

        const key = `${MODEL_KEY_PREFIX}${id}`;

        const upload = new Upload({

            client: getObjectStore(),

            params: {

                Bucket: OBJECT_STORE_BUCKET,

                Key: key,

                Body: file.stream,

                ContentType:
                    file.mimetype ||
                    "application/octet-stream",

                Metadata: {

                    originalname:
                        encodeURIComponent(
                            file.originalname
                        ),

                    extension
                }
            }
        });


        // Track uploaded bytes

        let bytes = 0;

        upload.on(
            "httpUploadProgress",
            (progress) => {

                if (progress.loaded) {
                    bytes = progress.loaded;
                }

            }
        );


        upload
            .done()

            .then(() => {

                const base =
                    process.env.SERVER_PUBLIC_URL ||
                    `${req.protocol}://${req.get("host")}`;


                cb(null, {

                    // Download API URL
                    path:
                        `${base}/api/quotation/files/${id}`,

                    // Object storage key
                    key,

                    // Stored filename
                    filename: id,

                    // Original filename
                    originalname:
                        file.originalname,

                    // Extension
                    extension,

                    // File size
                    size: bytes,

                    // MIME type
                    mimetype:
                        file.mimetype ||
                        "application/octet-stream"
                });

            })

            .catch(cb);
    }


    _removeFile(req, file, cb) {

        getObjectStore()

            .send(
                new DeleteObjectCommand({

                    Bucket:
                        OBJECT_STORE_BUCKET,

                    Key:
                        file.key
                })
            )

            .then(() => cb(null))

            .catch(cb);
    }
}



// ================================================================
// Cloudinary chunked storage
// Used only when S3 / R2 / B2 is NOT configured
// ================================================================

const MODEL_CHUNK_SIZE =
    6 * 1024 * 1024;


class CloudinaryChunkedStorage {

    constructor({ folder }) {

        this.folder = folder;
    }


    _handleFile(req, file, cb) {

        const extension =
            path
                .extname(file.originalname)
                .toLowerCase();


        const originalName =
            file.originalname;


        const nameWithoutExtension =
            path.basename(
                originalName,
                extension
            );


        const tmpPath =
            path.join(
                os.tmpdir(),
                `oros-3d-${randomUUID()}${extension}`
            );


        const sink =
            fs.createWriteStream(tmpPath);


        sink.on(
            "error",
            cb
        );


        file.stream.on(
            "error",
            (err) => {

                sink.destroy();

                fs.unlink(
                    tmpPath,
                    () => cb(err)
                );
            }
        );


        sink.on(
            "finish",
            () => {

                /*
                 * Upload the file to Cloudinary.
                 *
                 * We explicitly create the public_id
                 * with the original extension.
                 */

                getCloudinary()
                    .uploader
                    .upload_large(

                        tmpPath,

                        {

                            folder:
                                this.folder,

                            resource_type:
                                "raw",

                            /*
                             * Important:
                             * public_id contains extension
                             */

                            public_id:
                                `${nameWithoutExtension}-${randomUUID()}${extension}`,

                            /*
                             * Prevent Cloudinary from
                             * modifying the filename
                             */

                            use_filename:
                                false,

                            unique_filename:
                                false,

                            overwrite:
                                false,

                            chunk_size:
                                MODEL_CHUNK_SIZE
                        },


                        (err, result) => {

                            // Delete temporary file

                            fs.unlink(
                                tmpPath,
                                () => {}
                            );


                            if (
                                err ||
                                !result
                            ) {

                                return cb(

                                    err ||
                                    new Error(
                                        "3D model upload failed"
                                    )

                                );
                            }


                            /*
                             * Return complete file information
                             */

                            cb(null, {

                                path:
                                    result.secure_url,

                                filename:
                                    result.public_id,

                                originalname:
                                    originalName,

                                extension,

                                size:
                                    result.bytes,

                                mimetype:
                                    file.mimetype ||
                                    "application/octet-stream",

                                public_id:
                                    result.public_id
                            });

                        }
                    );

            }
        );


        file.stream.pipe(sink);
    }


    _removeFile(req, file, cb) {

        getCloudinary()
            .uploader
            .destroy(

                file.filename,

                {
                    resource_type: "raw"
                },

                cb
            );
    }
}



// ================================================================
// Select storage
// ================================================================

const storage =
    isObjectStoreConfigured

        ? new S3ModelStorage()

        : new CloudinaryChunkedStorage({
            folder: "oros/3d-models"
        });



// ================================================================
// File filter
// ================================================================

const fileFilter =
    (req, file, cb) => {

        const extension =
            path
                .extname(file.originalname)
                .toLowerCase();


        if (
            !ALLOWED_3D_FORMATS
                .includes(extension)
        ) {

            return cb(

                new Error(
                    "Only 3D model files are allowed"
                ),

                false
            );
        }


        cb(
            null,
            true
        );
    };



// ================================================================
// Multer upload
// ================================================================

export const quotationUpload =
    multer({

        storage,

        fileFilter,

        limits: {

            fileSize:
                100 * 1024 * 1024
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
