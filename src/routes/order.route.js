import express
    from "express";

import {
    createOrderController,
    getMyOrdersController,
     getAdminOrdersController,
     createManualOrder,
     createQuotationOrderController 
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

router.post("/manual",protect,authorize("staff","admin"),createManualOrder)

router.post(
    "/quotation/:quotationId",
    protect,
    createQuotationOrderController
);


export default router;