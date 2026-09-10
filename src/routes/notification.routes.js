import express from "express";

import {
    getNotifications,
    updateNotificationRead,
    deleteNotificationById,
    clearNotification
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
router.patch(
    "/:id",
    protect,
    authorize("user", "admin"),
   updateNotificationRead
);
router.delete(
    "/clear",
    protect,
    authorize("user", "admin"),
   clearNotification
);
router.delete(
    "/:id",
    protect,
    authorize("user", "admin"),
   deleteNotificationById
);



export default router;