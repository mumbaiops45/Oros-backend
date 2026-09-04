import express
    from "express";

import {
    createOrderController,
    getMyOrdersController,
     getAdminOrdersController,
     createManualOrder,
     createQuotationOrderController ,
     cancelStoreOrderController,
     updateStoreOrderStatusController
} from "../controllers/order.controller.js";
import { protect ,authorize} from "../middlewares/auth.middleware.js";


const router =
    express.Router();


router.post(
    "/",
    protect,
    authorize("user"),
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

router.patch(
    "/:id/cancel",
    protect,
    authorize("user"),
    cancelStoreOrderController
);

router.patch(
    "/:id/status",
    protect,
    authorize("admin"),
    updateStoreOrderStatusController
);


router.post("/manual",protect,authorize("staff","admin"),createManualOrder)

router.post(
    "/quotation/:quotationId",
    protect,
    authorize("user"),
    createQuotationOrderController
);




export default router;