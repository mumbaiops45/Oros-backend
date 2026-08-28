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

import {
    calculateCartPricing
} from "./pricing.service.js";

import {
    getSelectedShippingRate
} from "./shipping.service.js";

import Quotation
    from "../models/quotation.model.js";

export const getMyOrdersService =
    async (
        userId
    ) => {

        const orders =
            await Order.find({
                user: userId
            })
                .sort({
                    createdAt: -1
                })
                .lean();


        if (!orders.length) {

            return {
                message:
                    "No orders found",

                data: []
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


        return {

            message:
                "Orders fetched successfully",

            data:
                result

        };
    };


export const createOrderService =
    async (
        userId,
        {
            shippingQuoteId,
            shippingCourierId
        }
    ) => {

        /*
         * 1. Get cart
         */

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


        /*
         * 2. Validate populated products
         *
         * Because populate() is used,
         * item.product is now the Product
         * document, not only ObjectId.
         */

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


        /*
         * 3. Calculate pricing
         */

        const pricing =
            await calculateCartPricing(
                cartItems
            );


        /*
         * 4. Get address
         */

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


        /*
         * 5. Get selected shipping
         *
         * This reads the saved quote.
         * It does NOT call Shiprocket again.
         */

        const shipping =
            await getSelectedShippingRate(
                userId,
                shippingQuoteId,
                shippingCourierId
            );


        /*
         * 6. Calculate final total
         */

        const total =
            pricing.subtotal +
            shipping.shippingCharge +
            pricing.tax;


        /*
         * 7. Create Order
         */

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


        /*
         * 8. Create OrderItems
         */

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


        /*
         * 9. Save OrderItems
         */

        await OrderItem.insertMany(
            orderItems
        );


        /*
         * 10. Return
         */

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

export const getAdminOrdersService =
    async (userId) => {

        const filter = {};

        if (userId) {

            const user =
                await User.findById(
                    userId
                ).lean();

            if (!user) {
                throw httpError(
                    404,
                    "User not found"
                );
            }

            filter.user = userId;
        }

        const orders =
            await Order.find(filter)
                .populate(
                    "user",
                    "name phone email role accountType"
                )
                .sort({
                    createdAt: -1
                })
                .lean();

        if (!orders.length) {
            return {
                message: "No orders found",
                data: []
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

            data:
                result
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