import express from "express";

import {
    createShippingPackageController,
    getAllShippingPackagesController,
    getShippingPackageByIdController,
    updateShippingPackageController,
    deleteShippingPackageController
} from "../controllers/shippingPackage.controller.js";

import {
    protect,
    authorize
} from "../middlewares/auth.middleware.js";


const router = express.Router();


router.use(protect);


router.get(
    "/",
    authorize("admin"),
    getAllShippingPackagesController
);


router.get(
    "/:id",
    authorize("admin"),
    getShippingPackageByIdController
);


router.post(
    "/",
    authorize("admin"),
    createShippingPackageController
);


router.patch(
    "/:id",
    authorize("admin"),
    updateShippingPackageController
);


router.delete(
    "/:id",
    authorize("admin"),
    deleteShippingPackageController
);


export default router;