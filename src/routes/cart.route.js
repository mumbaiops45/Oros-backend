// src/routes/cart.route.js

import express from "express";

import { protect } from "../middlewares/auth.middleware.js";

import {
    addToCartController,
    getCartController,
    updateCartQuantityController,
    removeCartItemController,
    clearCartController
} from "../controllers/cart.controller.js";


const router = express.Router();

// every cart route belongs to the logged in user
router.use(protect);

router.post("/", addToCartController);

router.get("/", getCartController);

router.patch("/:id", updateCartQuantityController);

router.delete("/clear", clearCartController);

router.delete("/:id", removeCartItemController);

export default router;
