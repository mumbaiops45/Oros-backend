import express from "express";

import {
    createQuotation,
    updateQuotation,
    updateQuotationByAdmin,
    getQuotation,
    downloadQuotationFile
} from "../controllers/quotation.controller.js";

import {
    protect,
    authorize
} from "../middlewares/auth.middleware.js";

import {
    quotationUpload
} from "../middlewares/upload.middleware.js";

const router = express.Router();



router.post(
    "/",
    protect,
    authorize("user", "admin"),
    quotationUpload.array("files", 10),
    createQuotation
);



router.put(
    "/:id",
    protect,
    authorize("user", "admin"),
    quotationUpload.array("files", 10),
    updateQuotation
);


router.put(
    "/:id/admin",
    protect,
    authorize("admin"),
    updateQuotationByAdmin
);

// public: fileUrl links point here, presigned redirect to the bucket
router.get("/files/:id", downloadQuotationFile);

router.get("/",protect,authorize("admin","user"),getQuotation)


export default router;