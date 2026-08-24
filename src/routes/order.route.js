import express
    from "express";

import {
    createOrderController,
    getMyOrdersController,
     getAdminOrdersController
} from "../controllers/order.controller.js";
import { protect ,authorize} from "../middlewares/auth.middleware.js";


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

router.get(
    "/admin",
    protect,
    authorize("admin"),
    getAdminOrdersController
);


export default router;