import express from "express";

import {
    getProducts,
    getProductById,
    createProduct,
    updateProduct,
    deleteProduct,
    getSuggestedProducts,
    getBestSellerProducts
} from "../controllers/product.controller.js";

import {
    getSpecs,
    createSpec,
    updateSpec,
    deleteSpec
} from "../controllers/productSpec.controller.js";

import {
    getOptions,
    createOption,
    updateOption,
    deleteOption
} from "../controllers/productOption.controller.js";

import {
    getOptionValues,
    createOptionValue,
    updateOptionValue,
    deleteOptionValue
} from "../controllers/productOptionValue.controller.js";

import {
    getPriceSlabs,
    createPriceSlab,
    updatePriceSlab,
    deletePriceSlab
} from "../controllers/priceSlab.controller.js";

import {
    getMedia,
    createMedia,
    updateMedia,
    deleteMedia
} from "../controllers/productMedia.controller.js";

import {
    downloadImportTemplate,
    bulkImportProducts,
    bulkUploadMedia
} from "../controllers/bulk.controller.js";

import { protect, authorize } from "../middlewares/auth.middleware.js";

import {
    productMediaUpload,
    bulkImportUpload,
    bulkMediaUpload
} from "../middlewares/upload.middleware.js";

import {
    createProductShippingController,
    getAllProductShippingController,
    getProductShippingByProductController,
    updateProductShippingController,
    deleteProductShippingController
} from "../controllers/productShipping.controller.js";

const router = express.Router();

/* ------------------------------------------------------------------
   BULK  -  must stay above "/:id"
------------------------------------------------------------------ */

router.get(
    "/bulk-template",
    protect,
    authorize("admin"),
    downloadImportTemplate
);

router.post(
    "/bulk-import",
    protect,
    authorize("admin"),
    bulkImportUpload.single("file"),
    bulkImportProducts
);

router.post(
    "/bulk-media",
    protect,
    authorize("admin"),
    bulkMediaUpload.array("files", 200),
    bulkUploadMedia
);

/* ------------------------------------------------------------------
   OPTION VALUES  (option scoped)
------------------------------------------------------------------ */

router.get("/options/:optionId/values", getOptionValues);

router.post(
    "/options/:optionId/values",
    protect,
    authorize("admin"),
    createOptionValue
);

router.put(
    "/options/:optionId/values/:valueId",
    protect,
    authorize("admin"),
    updateOptionValue
);

router.delete(
    "/options/:optionId/values/:valueId",
    protect,
    authorize("admin"),
    deleteOptionValue
);

/* ------------------------------------------------------------------
   SPECS
------------------------------------------------------------------ */

router.get("/:productId/specs", getSpecs);

router.post(
    "/:productId/specs",
    protect,
    authorize("admin"),
    createSpec
);

router.put(
    "/:productId/specs/:specId",
    protect,
    authorize("admin"),
    updateSpec
);

router.delete(
    "/:productId/specs/:specId",
    protect,
    authorize("admin"),
    deleteSpec
);

/* ------------------------------------------------------------------
   OPTIONS
------------------------------------------------------------------ */

router.get("/:productId/options", getOptions);

router.post(
    "/:productId/options",
    protect,
    authorize("admin"),
    createOption
);

router.put(
    "/:productId/options/:optionId",
    protect,
    authorize("admin"),
    updateOption
);

router.delete(
    "/:productId/options/:optionId",
    protect,
    authorize("admin"),
    deleteOption
);

/* ------------------------------------------------------------------
   PRICE SLABS
------------------------------------------------------------------ */

router.get("/:productId/price-slabs", getPriceSlabs);

router.post(
    "/:productId/price-slabs",
    protect,
    authorize("admin"),
    createPriceSlab
);

router.put(
    "/:productId/price-slabs/:slabId",
    protect,
    authorize("admin"),
    updatePriceSlab
);

router.delete(
    "/:productId/price-slabs/:slabId",
    protect,
    authorize("admin"),
    deletePriceSlab
);

/* ------------------------------------------------------------------
   MEDIA  (single upload, straight to cloudinary, no queue)
------------------------------------------------------------------ */

router.get("/:productId/media", getMedia);

router.post(
    "/:productId/media",
    protect,
    authorize("admin"),
    productMediaUpload.single("file"),
    createMedia
);

router.put(
    "/:productId/media/:mediaId",
    protect,
    authorize("admin"),
    updateMedia
);

router.delete(
    "/:productId/media/:mediaId",
    protect,
    authorize("admin"),
    deleteMedia
);

// productShipping

router.get(
    "/shipping",protect,
    getAllProductShippingController
);


router.post(
    "/shipping",protect,
    authorize("admin"),
    createProductShippingController
);


router.patch(
    "/shipping/:id",protect,
    authorize("admin"),
    updateProductShippingController
);


router.delete(
    "/shipping/:id",protect,
    authorize("admin"),
    deleteProductShippingController
);
/* ------------------------------------------------------------------
   PRODUCT
------------------------------------------------------------------ */

router.get("/", getProducts);

router.get("/:id/suggestions", getSuggestedProducts);

router.get("/best-sellers", getBestSellerProducts);

router.get("/:id", getProductById);

router.post("/", protect, authorize("admin"), createProduct);

router.put("/:id", protect, authorize("admin"), updateProduct);

router.delete("/:id", protect, authorize("admin"), deleteProduct);



export default router;
