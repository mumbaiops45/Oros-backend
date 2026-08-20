import express from "express";

import {
    prepareShippingController
} from "../controllers/shipping.controller.js";

import {
    protect
} from "../middlewares/auth.middleware.js";


const router = express.Router();


router.use(protect);


router.get(
    "/prepare",
    prepareShippingController
);


export default router;