import express from "express";

import {
    upsertAddressController,
    getAddressController,
    updateAddressController,
    deleteAddressController
} from "../controllers/address.controller.js";

import {
    protect
} from "../middlewares/auth.middleware.js";


const router = express.Router();


router.use(protect);


router.post(
    "/",
    upsertAddressController
);


router.get(
    "/",
    getAddressController
);


router.patch(
    "/",
    updateAddressController
);


router.delete(
    "/",
    deleteAddressController
);


export default router;