// src/routes/cart.route.js

import express from "express";

import { protect,authorize } from "../middlewares/auth.middleware.js";

import {
    addToCartController,
    getCartController,
    updateCartQuantityController,
    removeCartItemController,
    clearCartController
} from "../controllers/cart.controller.js";


const router = express.Router();


router.use(protect);

router.post("/",authorize("user"), addToCartController);

router.get("/", getCartController);

router.patch("/:id",authorize("user"), updateCartQuantityController);

router.delete("/clear",authorize("user"), clearCartController);

router.delete("/:id",authorize("user"), removeCartItemController);

export default router;
