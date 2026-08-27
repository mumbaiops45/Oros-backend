import express from "express";

import {
    createQuotation,
    updateQuotation,
    updateQuotationByAdmin
} from "../controllers/quotation.controller.js";

import {
    protect,
    authorize
} from "../middlewares/auth.middleware.js";

import {
    quotationUpload
} from "../middlewares/upload.middleware.js";

const router = express.Router();


// Create quotation
router.post(
    "/",
    protect,
    authorize("user", "admin"),
    quotationUpload.array("files", 10),
    createQuotation
);


// Customer update
router.put(
    "/:id",
    protect,
    authorize("user", "admin"),
    quotationUpload.array("files", 10),
    updateQuotation
);


// Admin update
router.put(
    "/:id/admin",
    protect,
    authorize("admin"),
    updateQuotationByAdmin
);


export default router;