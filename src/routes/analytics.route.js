import express from "express";

import {
    getDashboardController,
    getOverviewController,
    getSalesTrendController,
    getTopProductsController,
    getTopCategoriesController,
    getTopCustomersController,
    getOrderBreakdownController,
    getQuotationAnalyticsController,
    getNonMovingProductsController
} from "../controllers/analytics.controller.js";

import {
    protect,
    authorize
} from "../middlewares/auth.middleware.js";

const router = express.Router();

/* every analytics route exposes business wide numbers, so the whole
   router is locked to staff and admin (superAdmin outranks both) */
router.use(protect, authorize("admin", "staff"));


// full admin dashboard in a single call
router.get("/dashboard", getDashboardController);

// KPI cards + growth against the previous window
router.get("/overview", getOverviewController);

// revenue / orders / units over time  (?groupBy=day|week|month|year)
router.get("/sales-trend", getSalesTrendController);

// maximum selling products  (?sortBy=revenue|qty&limit=10)
router.get("/top-products", getTopProductsController);

router.get("/top-categories", getTopCategoriesController);

router.get("/top-customers", getTopCustomersController);

// status / payment / source split of every order in the window
router.get("/order-breakdown", getOrderBreakdownController);

router.get("/quotations", getQuotationAnalyticsController);

// published products with zero sales in the window
router.get("/non-moving-products", getNonMovingProductsController);


export default router;
