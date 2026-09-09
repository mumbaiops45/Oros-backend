import express from "express";

import {
    getNotifications
} from "../controllers/notification.controller.js";

import {
    protect,
    authorize
} from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get(
    "/",
    protect,
    authorize("user", "admin"),
    getNotifications
);

export default router;