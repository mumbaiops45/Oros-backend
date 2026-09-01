import {
    getOverviewService,
    getSalesTrendService,
    getTopProductsService,
    getTopCategoriesService,
    getTopCustomersService,
    getOrderBreakdownService,
    getQuotationAnalyticsService,
    getNonMovingProductsService,
    getDashboardService
} from "../services/analytics.service.js";


export const getDashboardController = async (req, res) => {

    const { message, data } =
        await getDashboardService(req.query);

    return res.status(200).json({
        success: true,
        message,
        data
    });
};


export const getOverviewController = async (req, res) => {

    const { message, data } =
        await getOverviewService(req.query);

    return res.status(200).json({
        success: true,
        message,
        data
    });
};


export const getSalesTrendController = async (req, res) => {

    const { message, data } =
        await getSalesTrendService(req.query);

    return res.status(200).json({
        success: true,
        message,
        data
    });
};


export const getTopProductsController = async (req, res) => {

    const { message, data } =
        await getTopProductsService(req.query);

    return res.status(200).json({
        success: true,
        message,
        data
    });
};


export const getTopCategoriesController = async (req, res) => {

    const { message, data } =
        await getTopCategoriesService(req.query);

    return res.status(200).json({
        success: true,
        message,
        data
    });
};


export const getTopCustomersController = async (req, res) => {

    const { message, data } =
        await getTopCustomersService(req.query);

    return res.status(200).json({
        success: true,
        message,
        data
    });
};


export const getOrderBreakdownController = async (req, res) => {

    const { message, data } =
        await getOrderBreakdownService(req.query);

    return res.status(200).json({
        success: true,
        message,
        data
    });
};


export const getQuotationAnalyticsController = async (req, res) => {

    const { message, data } =
        await getQuotationAnalyticsService(req.query);

    return res.status(200).json({
        success: true,
        message,
        data
    });
};


export const getNonMovingProductsController = async (req, res) => {

    const { message, data } =
        await getNonMovingProductsService(req.query);

    return res.status(200).json({
        success: true,
        message,
        data
    });
};
