import {
    createCouponService,
    getAllCouponService,
    getCouponByIdService,
    updateCouponService,
    deleteCouponService,
    validateCouponService
} from "../services/coupon.service.js";


export const getAllCoupon = async (req, res) => {

    const { page, limit } = req.query;

    const { message, data } = await getAllCouponService({
        page,
        limit
    });

    res.json({
        success: true,
        message,
        data
    });
};


export const getCouponById = async (req, res) => {

    const { id } = req.params;

    const { message, data } = await getCouponByIdService(id);

    res.json({
        success: true,
        message,
        data
    });
};


export const createCoupon = async (req, res) => {

    const dataCoupon = {
        ...req.body
    };

    const { message, data } = await createCouponService(dataCoupon);

    res.json({
        success: true,
        message,
        data
    });
};


export const updateCoupon = async (req, res) => {

    const { id } = req.params;

    const dataCoupon = {
        ...req.body
    };

    const { message, data } = await updateCouponService(
        id,
        dataCoupon
    );

    res.json({
        success: true,
        message,
        data
    });
};


export const deleteCoupon = async (req, res) => {

    const { id } = req.params;

    const { message, data } = await deleteCouponService(id);

    res.json({
        success: true,
        message,
        data
    });
};


export const validateCoupon = async (req, res) => {

    const { code, orderValue } = req.body;

    const { message, data } = await validateCouponService(
        code,
        orderValue
    );

    res.json({
        success: true,
        message,
        data
    });
};