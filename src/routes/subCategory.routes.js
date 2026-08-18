import express from "express";
import {getallSubCategory, createSubcategory ,updateSubCategory,deleteSubCategory} from "../controllers/subCategory.controller.js";
import { subCategoryUpload } from "../middlewares/upload.middleware.js";
import { protect,authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();
router.get("/",getallSubCategory);
router.post("/",protect,authorize("admin"),subCategoryUpload.single("image"),createSubcategory);
router.put("/:id",protect,authorize("admin"),subCategoryUpload.single("image"),updateSubCategory);
router.delete("/:id",protect,authorize("admin"),subCategoryUpload.single("image"),deleteSubCategory);

export default router;