import express from "express";
import { categoryUpload } from "../middlewares/upload.middleware.js";
import {getAllCategory, createCategory,updateCategory , deleteCategory } from "../controllers/category.controller.js";

import {
    protect,
    authorize
} from "../middlewares/auth.middleware.js";

const router = express.Router();


router.get("/",getAllCategory)
router.post("/",protect,authorize("admin"),categoryUpload.single("image"),createCategory);
router.put("/:id",protect,authorize("admin"),categoryUpload.single("image"),updateCategory)
router.delete("/:id",protect,authorize("admin"),deleteCategory)





export default router;