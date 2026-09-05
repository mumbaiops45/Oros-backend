import Cart
    from "../models/cart.model.js";
import User from "../models/User.model.js";

import Address
    from "../models/address.model.js";

import Order
    from "../models/order.model.js";

import OrderItem
    from "../models/orderItem.model.js";

import httpError
    from "../utils/httpError.js";

import Product from "../models/product.model.js";

import Coupon from "../models/coupon.model.js";

import {
    calculateCartPricing
} from "./pricing.service.js";

import {
    getSelectedShippingRate
} from "./shipping.service.js";

import Quotation
    from "../models/quotation.model.js";

    import { clearCartService } from "./cart.service.js";

export const getMyOrdersService =
    async (
        userId,
        page = 1,
        limit = 10
    ) => {

        page = Number(page);
        limit = Number(limit);

        const skip =
            (page - 1) * limit;


        const filter = {
            user: userId
        };


        const totalOrders =
            await Order.countDocuments(
                filter
            );


        const orders =
            await Order.find(
                filter
            )
                .populate(
                    "quotation",
                    "type refNumber"
                )
                .sort({
                    createdAt: -1
                })
                .skip(skip)
                .limit(limit)
                .lean();


        if (!orders.length) {

            return {
                message:
                    "No orders found",

                data: {
                    orders: [],

                    pagination: {
                        page,
                        limit,
                        totalOrders,
                        totalPages:
                            Math.ceil(
                                totalOrders / limit
                            ),
                        hasNextPage: false,
                        hasPreviousPage:
                            page > 1
                    }
                }
            };
        }


        const orderIds =
            orders.map(
                order =>
                    order._id
            );


        const orderItems =
            await OrderItem.find({
                order: {
                    $in: orderIds
                }
            })
                .lean();


        const itemsMap =
            new Map();


        for (
            const item
            of orderItems
        ) {

            const orderId =
                item.order.toString();


            if (
                !itemsMap.has(
                    orderId
                )
            ) {

                itemsMap.set(
                    orderId,
                    []
                );
            }


            itemsMap
                .get(orderId)
                .push(item);
        }


        const result =
            orders.map(
                order => ({

                    ...order,

                    items:
                        itemsMap.get(
                            order._id.toString()
                        ) || []

                })
            );


        const totalPages =
            Math.ceil(
                totalOrders / limit
            );


        return {

            message:
                "Orders fetched successfully",

            data: {

                orders:
                    result,

                pagination: {

                    page,

                    limit,

                    totalOrders,

                    totalPages,

                    hasNextPage:
                        page < totalPages,

                    hasPreviousPage:
                        page > 1

                }

            }

        };
    };


export const createOrderService = async (
    userId,
    {
        shippingQuoteId,
        shippingCourierId,
        couponCode
    }
) => {

    // ==========================================
    // 1. Get cart
    // ==========================================

    const cartItems =
        await Cart.find({
            user: userId
        })
            .populate(
                "product",
                "name sku basePrice taxRate status"
            )
            .lean();

    if (!cartItems.length) {
        throw httpError(
            400,
            "Cart is empty"
        );
    }


    // ==========================================
    // 2. Validate populated products
    // ==========================================

    for (
        const item
        of cartItems
    ) {

        if (!item.product) {
            throw httpError(
                400,
                "Product not found"
            );
        }

        if (
            item.product.status !==
            "PUBLISHED"
        ) {
            throw httpError(
                400,
                `${item.product.name} is unavailable`
            );
        }
    }


    // ==========================================
    // 3. Calculate pricing
    // ==========================================

    const pricing =
        await calculateCartPricing(
            cartItems
        );


    // ==========================================
    // 4. Apply coupon
    // ==========================================

    let discount = 0;
    let appliedCouponCode = null;

    if (couponCode) {

        const coupon =
            await Coupon.findOne({
                code: couponCode.toUpperCase(),
                isActive: true
            }).lean();

        if (!coupon) {
            throw httpError(
                400,
                "Invalid coupon code"
            );
        }


        const now = new Date();


        // Coupon not started

        if (now < coupon.startDate) {
            throw httpError(
                400,
                "Coupon is not active yet"
            );
        }


        // Coupon expired

        if (now > coupon.endDate) {
            throw httpError(
                400,
                "Coupon has expired"
            );
        }


        // Minimum order value

        if (
            pricing.subtotal <
            coupon.minOrderValue
        ) {
            throw httpError(
                400,
                `Minimum order value is ${coupon.minOrderValue}`
            );
        }


        // Calculate percentage discount

        if (
            coupon.discountType ===
            "PERCENTAGE"
        ) {

            discount =
                (
                    pricing.subtotal *
                    coupon.discountValue
                ) / 100;

        }


        // Calculate fixed discount

        if (
            coupon.discountType ===
            "FIXED"
        ) {

            discount =
                coupon.discountValue;
        }


        // Discount cannot be greater
        // than product subtotal

        discount = Math.min(
            discount,
            pricing.subtotal
        );


        appliedCouponCode =
            coupon.code;
    }


    // ==========================================
    // 5. Get address
    // ==========================================

    const address =
        await Address.findOne({
            user: userId
        }).lean();

    if (!address) {
        throw httpError(
            400,
            "Shipping address is required"
        );
    }


    // ==========================================
    // 6. Get selected shipping
    // ==========================================

    const shipping =
        await getSelectedShippingRate(
            userId,
            shippingQuoteId,
            shippingCourierId
        );


    // ==========================================
    // 7. Calculate final total
    // ==========================================

    const total =
        pricing.subtotal +
        shipping.shippingCharge +
        pricing.tax -
        discount;


    // ==========================================
    // 8. Create Order
    // ==========================================

    const order =
        await Order.create({

            user:
                userId,

            source:
                "STORE",

            status:
                "PENDING_PAYMENT",

            pricing: {

                subtotal:
                    pricing.subtotal,

                shipping:
                    shipping.shippingCharge,

                tax:
                    pricing.tax,

                discount:
                    discount,

                couponCode:
                    appliedCouponCode,

                total:
                    total
            },

            shippingAddress: {

                name:
                    address.name,

                phone:
                    address.phone,

                addressLine1:
                    address.addressLine1,

                addressLine2:
                    address.addressLine2,

                city:
                    address.city,

                state:
                    address.state,

                country:
                    address.country,

                pincode:
                    address.pincode
            },

            shipping: {

                pickupPincode:
                    shipping.pickupPincode,

                deliveryPincode:
                    shipping.deliveryPincode,

                courierId:
                    shipping.courierId,

                courierName:
                    shipping.courierName,

                shippingCharge:
                    shipping.shippingCharge,

                estimatedDelivery:
                    shipping.estimatedDelivery
            },

            payment: {

                method:
                    "ONLINE",

                provider:
                    "RAZORPAY",

                status:
                    "PENDING"
            }
        });


    // ==========================================
    // 9. Create OrderItems
    // ==========================================

    const orderItems =
        pricing.items.map(
            item => ({

                order:
                    order._id,

                product:
                    item.product,

                nameSnapshot:
                    item.nameSnapshot,

                skuSnapshot:
                    item.skuSnapshot,

                qty:
                    item.qty,

                unitPrice:
                    item.unitPrice,

                selectedOptions:
                    item.selectedOptions,

                personalisation:
                    item.personalisation,

                taxRate:
                    item.taxRate,

                taxAmount:
                    item.taxAmount,

                lineTotal:
                    item.lineTotal
            })
        );


    // ==========================================
    // 10. Save OrderItems
    // ==========================================

    await OrderItem.insertMany(
        orderItems
    );

    await clearCartService(
        userId
    );


    // ==========================================
    // 11. Return
    // ==========================================

    return {

        message:
            "Order created successfully",

        data: {

            order,

            items:
                orderItems
        }
    };
};

export const getAdminOrdersService = async (
    userId,
    page = 1,
    limit = 10
) => {

    page = Number(page);
    limit = Number(limit);

    const skip = (page - 1) * limit;

    const filter = {};

    if (userId) {

        const user =
            await User.findById(userId).lean();

        if (!user) {
            throw httpError(
                404,
                "User not found"
            );
        }

        filter.user = userId;
    }

    const totalOrders =
        await Order.countDocuments(filter);

    const orders =
        await Order.find(filter)
            .populate(
                "user",
                "name phone email role accountType"
            )
            .populate(
                "quotation",
                "type refNumber"
            )
            .sort({
                createdAt: -1
            })
            .skip(skip)
            .limit(limit)
            .lean();

    if (!orders.length) {
        return {
            message: "No orders found",
            data: {
                orders: [],
                pagination: {
                    page,
                    limit,
                    totalOrders,
                    totalPages: Math.ceil(
                        totalOrders / limit
                    ),
                    hasNextPage: false,
                    hasPreviousPage: page > 1
                }
            }
        };
    }

    const orderIds =
        orders.map(
            order => order._id
        );

    const orderItems =
        await OrderItem.find({
            order: {
                $in: orderIds
            }
        })
            .populate(
                "product",
                "name sku images"
            )
            .lean();

    const itemsMap =
        new Map();

    for (
        const item
        of orderItems
    ) {

        const orderId =
            item.order.toString();

        if (
            !itemsMap.has(
                orderId
            )
        ) {
            itemsMap.set(
                orderId,
                []
            );
        }

        itemsMap
            .get(orderId)
            .push(item);
    }

    const result =
        orders.map(
            order => ({
                ...order,

                items:
                    itemsMap.get(
                        order._id.toString()
                    ) || []
            })
        );

    return {
        message:
            "Orders fetched successfully",

        data: {
            orders: result,

            pagination: {
                page,
                limit,
                totalOrders,
                totalPages: Math.ceil(
                    totalOrders / limit
                ),
                hasNextPage:
                    page <
                    Math.ceil(
                        totalOrders / limit
                    ),
                hasPreviousPage:
                    page > 1
            }
        }
    };
};



export const createManualOrderService =
    async (
        data,
        createdByUser
    ) => {

        const {
            userId,
            items,
            paymentMethod
        } = data;


        // ==========================================
        // 1. Validate customer
        // ==========================================

        if (!userId) {

            throw httpError(
                400,
                "Customer userId is required"
            );
        }


        const customer =
            await User.findById(
                userId
            ).lean();


        if (!customer) {

            throw httpError(
                404,
                "Customer not found"
            );
        }


        // Manual order must belong
        // to a normal customer

        if (
            customer.role !== "user"
        ) {

            throw httpError(
                400,
                "Manual order can only be created for a customer"
            );
        }


        // ==========================================
        // 2. Validate payment method
        // ==========================================

        const allowedPaymentMethods = [
            "CASH",
            "UPI",
            "CARD"
        ];


        if (
            !allowedPaymentMethods.includes(
                paymentMethod
            )
        ) {

            throw httpError(
                400,
                "Invalid payment method"
            );
        }


        // ==========================================
        // 3. Validate products
        // ==========================================

        if (
            !Array.isArray(items) ||
            items.length === 0
        ) {

            throw httpError(
                400,
                "At least one product is required"
            );
        }


        // ==========================================
        // 4. Get product IDs
        // ==========================================

        const productIds =
            items.map(
                item => item.product
            );


        const products =
            await Product.find({
                _id: {
                    $in: productIds
                }
            }).lean();


        if (
            products.length !==
            productIds.length
        ) {

            throw httpError(
                400,
                "One or more products were not found"
            );
        }


        // ==========================================
        // 5. Create pricing items
        // ==========================================

        const productMap =
            new Map(
                products.map(
                    product => [
                        product._id.toString(),
                        product
                    ]
                )
            );


        const pricingItems = [];


        for (
            const item
            of items
        ) {

            if (!item.product) {

                throw httpError(
                    400,
                    "Product is required"
                );
            }


            const quantity =
                Number(item.qty);


            if (
                !Number.isInteger(
                    quantity
                ) ||
                quantity < 1
            ) {

                throw httpError(
                    400,
                    "Quantity must be at least 1"
                );
            }


            const product =
                productMap.get(
                    item.product.toString()
                );


            if (!product) {

                throw httpError(
                    404,
                    "Product not found"
                );
            }


            if (
                product.status !==
                "PUBLISHED"
            ) {

                throw httpError(
                    400,
                    `${product.name} is unavailable`
                );
            }


            const selectedOptions =
                item.selectedOptions || [];


            if (
                !Array.isArray(
                    selectedOptions
                )
            ) {

                throw httpError(
                    400,
                    "selectedOptions must be an array"
                );
            }


            const personalisation =
                item.personalisation || {};


            if (
                personalisation === null ||
                typeof personalisation !==
                "object" ||
                Array.isArray(
                    personalisation
                )
            ) {

                throw httpError(
                    400,
                    "personalisation must be an object"
                );
            }


            pricingItems.push({

                product,

                qty:
                    quantity,

                selectedOptions,

                personalisation,

                taxRate:
                    product.taxRate ?? 0
            });
        }


        // ==========================================
        // 6. Calculate product pricing
        // ==========================================

        const pricing =
            await calculateCartPricing(
                pricingItems
            );


        // ==========================================
        // 7. Manual order has no shipping charge
        // ==========================================

        const shipping =
            0;


        const total =
            pricing.subtotal +
            pricing.tax +
            shipping;


        // ==========================================
        // 8. Create order
        // ==========================================

        const order =
            await Order.create({

                // Customer
                user:
                    userId,

                // Admin/Staff who created order
                createdBy:
                    createdByUser._id,

                source:
                    "MANUAL",

                status:
                    "COMPLETED",

                pricing: {

                    subtotal:
                        pricing.subtotal,

                    shipping:
                        0,

                    tax:
                        pricing.tax,

                    total
                },

                // No shipping address
                shippingAddress: {},

                // No shipping calculation
                shipping: {

                    pickupPincode:
                        null,

                    deliveryPincode:
                        null,

                    courierId:
                        null,

                    courierName:
                        null,

                    shippingCharge:
                        0,

                    estimatedDelivery:
                        null
                },

                payment: {

                    method:
                        paymentMethod,

                    provider:
                        paymentMethod,

                    status:
                        "PAID",

                    paymentOrderId:
                        null,

                    transactionId:
                        null,

                    paidAt:
                        null
                }
            });


        // ==========================================
        // 9. Create order items
        // ==========================================

        const orderItems =
            pricing.items.map(
                item => ({

                    order:
                        order._id,

                    product:
                        item.product,

                    nameSnapshot:
                        item.nameSnapshot,

                    skuSnapshot:
                        item.skuSnapshot,

                    qty:
                        item.qty,

                    unitPrice:
                        item.unitPrice,

                    selectedOptions:
                        item.selectedOptions,

                    personalisation:
                        item.personalisation,

                    taxRate:
                        item.taxRate,

                    taxAmount:
                        item.taxAmount,

                    lineTotal:
                        item.lineTotal
                })
            );


        await OrderItem.insertMany(
            orderItems
        );


        // ==========================================
        // 10. Return
        // ==========================================

        return {

            message:
                "Manual order created successfully",

            data: {

                order,

                items:
                    orderItems
            }
        };
    };

export const createQuotationOrderService = async (
    userId,
    quotationId
) => {

    // ==========================================
    // 1. Validate quotation id
    // ==========================================

    if (!quotationId) {
        throw httpError(
            400,
            "Quotation id is required"
        );
    }

    // ==========================================
    // 2. Find customer's quotation
    // ==========================================

    const quotation =
        await Quotation.findOne({
            _id: quotationId,
            customer: userId
        }).lean();

    if (!quotation) {
        throw httpError(
            404,
            "Quotation not found"
        );
    }

    // ==========================================
    // 3. Only ACCEPTED quotation can become order
    // ==========================================

    if (quotation.status !== "ACCEPTED") {
        throw httpError(
            400,
            "Only an accepted quotation can be converted to an order"
        );
    }

    // ==========================================
    // 4. Prevent duplicate order
    // ==========================================

    if (quotation.convertedOrderId) {
        throw httpError(
            400,
            "Quotation has already been converted to an order"
        );
    }

    // ==========================================
    // 5. Check quotation validity
    // ==========================================

    if (
        quotation.validTill &&
        new Date(quotation.validTill) < new Date()
    ) {
        throw httpError(
            400,
            "Quotation has expired"
        );
    }

    // ==========================================
    // 6. Validate shipping address
    // ==========================================

    const address =
        quotation.shippingAddress || {};

    if (
        !address.name ||
        !address.phone ||
        !address.addressLine1 ||
        !address.city ||
        !address.state ||
        !address.country ||
        !address.pincode
    ) {
        throw httpError(
            400,
            "Complete shipping address is required"
        );
    }

    // ==========================================
    // 7. Get quotation pricing
    // ==========================================

    const subtotal =
        Number(quotation.subTotal) || 0;

    const tax =
        Number(quotation.tax) || 0;

    const shipping =
        Number(quotation.shipping) || 0;

    const total =
        Number(quotation.total) || 0;

    if (
        subtotal < 0 ||
        tax < 0 ||
        shipping < 0 ||
        total < 0
    ) {
        throw httpError(
            400,
            "Invalid quotation pricing"
        );
    }

    // ==========================================
    // 8. Create Order
    // ==========================================

    const order =
        await Order.create({

            // Customer
            user: userId,

            // Not manually created by admin
            createdBy: null,

            // Order came from quotation
            source: "QUOTATION",

            // Link quotation
            quotation: quotation._id,

            // Payment pending
            status: "PENDING_PAYMENT",

            // Quotation pricing
            pricing: {
                subtotal,
                shipping,
                tax,
                total
            },

            // ==================================
            // Shipping address snapshot
            // ==================================

            shippingAddress: {
                name:
                    address.name,

                phone:
                    address.phone,

                addressLine1:
                    address.addressLine1,

                addressLine2:
                    address.addressLine2 || "",

                city:
                    address.city,

                state:
                    address.state,

                country:
                    address.country,

                pincode:
                    address.pincode
            },

            // ==================================
            // Shipping
            // ==================================

            shipping: {
                pickupPincode: null,

                deliveryPincode:
                    address.pincode,

                courierId: null,

                courierName: null,

                shippingCharge:
                    shipping,

                estimatedDelivery: null
            },

            // ==================================
            // Payment
            // ==================================

            payment: {
                method: "ONLINE",

                provider: "RAZORPAY",

                status: "PENDING",

                paymentOrderId: null,

                transactionId: null,

                paidAt: null
            }
        });

    // ==========================================
    // 9. Mark quotation as converted
    // ==========================================

    await Quotation.findByIdAndUpdate(
        quotationId,
        {
            status: "CONVERTED",
            convertedOrderId: order._id
        },
        {
            new: true,
            runValidators: true
        }
    );

    // ==========================================
    // 10. Return
    // ==========================================

    return {
        message:
            "Quotation converted to order successfully",

        data: {
            order
        }
    };
};


// ==========================================
// CUSTOMER CANCEL STORE ORDER
// ==========================================

export const cancelStoreOrderService = async (
    orderId,
    userId
) => {

    // ==========================================
    // 1. Find order
    // ==========================================

    const order = await Order.findOne({
        _id: orderId,
        user: userId,
        source: "STORE"
    });

    if (!order) {
        throw httpError(
            404,
            "Store order not found"
        );
    }


    // ==========================================
    // 2. Check current status
    // ==========================================

    if (
        order.status === "IN_PRODUCTION" ||
        order.status === "COMPLETED"
    ) {
        throw httpError(
            400,
            "Order cannot be cancelled after production has started"
        );
    }


    // ==========================================
    // 3. Already cancelled
    // ==========================================

    if (order.status === "CANCELLED") {
        throw httpError(
            400,
            "Order is already cancelled"
        );
    }


    // ==========================================
    // 4. Cancel order
    // ==========================================

    order.status = "CANCELLED";

    await order.save();


    // ==========================================
    // 5. Return
    // ==========================================

    return {
        message: "Order cancelled successfully",

        data: {
            order
        }
    };
};


// ==========================================
// ADMIN UPDATE STORE ORDER STATUS
// ==========================================

export const updateStoreOrderStatusService = async (
    orderId,
    status
) => {

    // ==========================================
    // 1. Validate status
    // ==========================================

    const allowedStatuses = [
        "PENDING_PAYMENT",
        "PAID",
        "CONFIRMED",
        "PROCESSING",
        "IN_PRODUCTION",
        "COMPLETED",
        "CANCELLED"
    ];

    if (!status) {
        throw httpError(
            400,
            "Order status is required"
        );
    }


    if (!allowedStatuses.includes(status)) {
        throw httpError(
            400,
            "Invalid order status"
        );
    }


    // ==========================================
    // 2. Find STORE order
    // ==========================================

    const order = await Order.findOne({
        _id: orderId,
        source: "STORE"
    });

    if (!order) {
        throw httpError(
            404,
            "Store order not found"
        );
    }


    // ==========================================
    // 3. Already completed
    // ==========================================

    if (order.status === "COMPLETED") {

        throw httpError(
            400,
            "Completed order cannot be updated"
        );
    }


    // ==========================================
    // 4. Already cancelled
    // ==========================================

    if (order.status === "CANCELLED") {

        throw httpError(
            400,
            "Cancelled order cannot be updated"
        );
    }


    // ==========================================
    // 5. Update status
    // ==========================================

    order.status = status;

    await order.save();


    // ==========================================
    // 6. Return
    // ==========================================

    return {
        message: "Order status updated successfully",

        data: {
            order
        }
    };
};