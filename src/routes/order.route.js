import express
    from "express";

import {
    createOrderController,
    getMyOrdersController
} from "../controllers/order.controller.js";
import { protect } from "../middlewares/auth.middleware.js";


const router =
    express.Router();


router.post(
    "/",
    protect,
    createOrderController
);


router.get(
    "/my-orders",
    protect,
    getMyOrdersController
);


export default router;