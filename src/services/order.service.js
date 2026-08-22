import Cart
    from "../models/cart.model.js";

import Address
    from "../models/address.model.js";

import Order
    from "../models/order.model.js";

import OrderItem
    from "../models/orderItem.model.js";

import httpError
    from "../utils/httpError.js";

import {
    calculateCartPricing
} from "./pricing.service.js";

import {
    getSelectedShippingRate
} from "./shipping.service.js";


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