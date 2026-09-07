import { S3Client } from "@aws-sdk/client-s3";

/* ------------------------------------------------------------------
   Object storage for large binary uploads (3D models).

   Cloudinary's free plan rejects any single asset over 10 MB, and 3D
   models routinely run larger. This points at an S3-compatible bucket
   instead - Cloudflare R2 (10 GB free, no egress fees), AWS S3 or
   Backblaze B2 all work with the same client.

   Set these env vars to turn it on:

     S3_ENDPOINT          e.g. https://<accountid>.r2.cloudflarestorage.com
     S3_REGION            "auto" for R2, otherwise the bucket's region
     S3_BUCKET            bucket name
     S3_ACCESS_KEY_ID
     S3_SECRET_ACCESS_KEY

   Until they're set, uploads fall back to Cloudinary (10 MB cap).
------------------------------------------------------------------ */

export const isObjectStoreConfigured = Boolean(
    process.env.S3_ENDPOINT &&
    process.env.S3_BUCKET &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
);

export const OBJECT_STORE_BUCKET = process.env.S3_BUCKET;

// key prefix for quotation 3D-model objects; the download route rebuilds
// the full key from the id in the URL, so keep it slash-terminated
export const MODEL_KEY_PREFIX = "oros/3d-models/";

let client = null;

export const getObjectStore = () => {

    if (!isObjectStoreConfigured) {
        throw new Error("Object storage is not configured");
    }

    if (!client) {
        client = new S3Client({
            endpoint: process.env.S3_ENDPOINT,
            region: process.env.S3_REGION || "auto",
            credentials: {
                accessKeyId: process.env.S3_ACCESS_KEY_ID,
                secretAccessKey: process.env.S3_SECRET_ACCESS_KEY
            },
            // R2 and most S3-compatibles need path-style addressing
            forcePathStyle: true
        });
    }

    return client;
};
