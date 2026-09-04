import Coupon from "../models/coupon.model.js";
import httpError from "../utils/httpError.js";


export const getAllCouponService = async ({
    page = 1,
    limit = 15
}) => {

    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const coupons = await Coupon.find()
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

    return {
        message: "Coupons fetched successfully",
        data: {
            coupons
        }
    };
};


export const getCouponByIdService = async (id) => {

    const coupon = await Coupon.findById(id).lean();

    if (!coupon) {
        throw new Error("Coupon not found");
    }

    return {
        message: "Coupon fetched successfully",
        data: {
            coupon
        }
    };
};


export const createCouponService = async (data) => {

    const exist = await Coupon.findOne({
        code: data.code.toUpperCase()
    }).lean();

    if (exist) {
        throw new Error("Coupon already exists");
    }

    if (
        data.discountType === "PERCENTAGE" &&
        data.discountValue > 100
    ) {
        throw new Error(
            "Percentage discount cannot be greater than 100"
        );
    }

    if (
        new Date(data.startDate) >= new Date(data.endDate)
    ) {
        throw new Error(
            "End date must be greater than start date"
        );
    }

    const coupon = await Coupon.create({
        ...data,
        code: data.code.toUpperCase()
    });

    return {
        message: "Coupon created successfully",
        data: {
            coupon
        }
    };
};


export const updateCouponService = async (id, data) => {

    const coupon = await Coupon.findById(id);

    if (!coupon) {
        throw new Error("Coupon not found");
    }

    if (data.code) {
        data.code = data.code.toUpperCase();
    }

    if (
        data.discountType === "PERCENTAGE" &&
        data.discountValue > 100
    ) {
        throw new Error(
            "Percentage discount cannot be greater than 100"
        );
    }

    if (
        data.startDate &&
        data.endDate &&
        new Date(data.startDate) >= new Date(data.endDate)
    ) {
        throw new Error(
            "End date must be greater than start date"
        );
    }

    const updatedCoupon = await Coupon.findByIdAndUpdate(
        id,
        data,
        {
            new: true,
            runValidators: true
        }
    );

    return {
        message: "Coupon updated successfully",
        data: {
            coupon: updatedCoupon
        }
    };
};


export const deleteCouponService = async (id) => {

    const coupon = await Coupon.findById(id);

    if (!coupon) {
        throw new Error("Coupon not found");
    }

    const deletedCoupon = await Coupon.findByIdAndDelete(id);

    return {
        message: "Coupon deleted successfully",
        data: {
            coupon: deletedCoupon
        }
    };
};


export const validateCouponService = async (
    code,
    orderValue
) => {

    if (!code) {
        throw httpError(400, "Coupon code is required");
    }

    orderValue = Number(orderValue);

    if (!Number.isFinite(orderValue) || orderValue < 0) {
        throw httpError(400, "A valid order value is required");
    }

    const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true
    }).lean();

    if (!coupon) {
        throw httpError(400, "Invalid coupon code");
    }

    const now = new Date();

    if (coupon.startDate && now < new Date(coupon.startDate)) {
        throw httpError(400, "Coupon is not active yet");
    }

    if (coupon.endDate && now > new Date(coupon.endDate)) {
        throw httpError(400, "Coupon has expired");
    }

    if (orderValue < (coupon.minOrderValue || 0)) {
        throw httpError(
            400,
            `Minimum order value for this coupon is ${coupon.minOrderValue}`
        );
    }

    let discount = 0;

    if (coupon.discountType === "PERCENTAGE") {

        discount =
            (orderValue * coupon.discountValue) / 100;

    } else if (coupon.discountType === "FIXED") {

        discount = coupon.discountValue;
    }

    // Discount should never be greater than order value
    discount = Math.min(discount, orderValue);

    const finalAmount = orderValue - discount;

    return {
        message: "Coupon applied successfully",
        data: {
            coupon: {
                id: coupon._id,
                code: coupon.code,
                discountType: coupon.discountType,
                discountValue: coupon.discountValue
            },
            discount,
            finalAmount
        }
    };
};