import express from "express";
const router = express.Router();
import { createBanner, getBanners, updateBannerById } from "../controllers/banner.controller.js";
import { bannerUpload } from "../middlewares/upload.middleware.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const media = bannerUpload.fields([
    { name: "mediaDesktop", maxCount: 1 },
    { name: "mediaMobile", maxCount: 1 }
]);

// Public: the home page reads its slider and showreel from here.
// ?type=SLIDER|SHOWREEL narrows it; ?isActive=true hides the ones taken down.
router.get("/", getBanners);

router.post("/", protect, authorize("admin"), media, createBanner);

router.put("/:id", protect, authorize("admin"), media, updateBannerById);

export default router
