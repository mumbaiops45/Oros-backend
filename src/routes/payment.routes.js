import express from "express";

import {
    protect,
    authorize
} from "../middlewares/auth.middleware.js";

import {
    createPaymentOrder,
    verifyPayment
} from "../controllers/payment.controller.js";


const router =
    express.Router();


router.post(
    "/create-order/:orderId",
    protect,
    authorize("user"),
    createPaymentOrder
);


router.post(
    "/verify",
    protect,
    authorize("user"),
    verifyPayment
);


export default router;