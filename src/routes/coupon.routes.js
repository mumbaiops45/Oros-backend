import express from "express";

import {
    getAllCoupon,
    getCouponById,
    createCoupon,
    updateCoupon,
    deleteCoupon,
    validateCoupon
} from "../controllers/coupon.controller.js";

import {
    protect,
    authorize
} from "../middlewares/auth.middleware.js";

const router = express.Router();


// ==========================================
// PUBLIC
// ==========================================

router.get("/", getAllCoupon);

router.get("/:id", getCouponById);

router.post("/validate", validateCoupon);


// ==========================================
// ADMIN
// ==========================================

router.post(
    "/",
    protect,
    authorize("admin"),
    createCoupon
);

router.put(
    "/:id",
    protect,
    authorize("admin"),
    updateCoupon
);

router.delete(
    "/:id",
    protect,
    authorize("admin"),
    deleteCoupon
);

export default router;