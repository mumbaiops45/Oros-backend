import mongoose from "mongoose";
import Cart from "../models/cart.model.js";

import Product from "../models/product.model.js";

import ProductShipping
    from "../models/productShipping.model.js";

import ShippingPackage
    from "../models/shippingPackage.model.js";

import Address
    from "../models/address.model.js";

import httpError
    from "../utils/httpError.js";

import {
    createPackages
} from "./packing.service.js";

import {
    getShiprocketRates
} from "./shiprocket.service.js";

import ShippingQuote
    from "../models/shippingQuote.model.js";



export const prepareShippingService =
    async (userId) => {

        /*
         * 1. Get customer address
         */

        const address =
            await Address.findOne({
                user: userId
            }).lean();


        if (!address) {

            throw httpError(
                400,
                "Please add your delivery address first"
            );
        }


        /*
         * 2. Get cart
         */

        const cartItems =
            await Cart.find({
                user: userId
            }).lean();


        if (!cartItems.length) {

            throw httpError(
                400,
                "Cart is empty"
            );
        }


        /*
         * 3. Get product IDs
         */

        const productIds =
            cartItems.map(
                item => item.product
            );


        /*
         * 4. Get everything together
         */

        const [
            products,
            productShipping,
            shippingBoxes
        ] = await Promise.all([

            Product.find({
                _id: {
                    $in: productIds
                },
                status: "PUBLISHED"
            }).lean(),

            ProductShipping.find({
                product: {
                    $in: productIds
                }
            }).lean(),

            ShippingPackage.find({
                isActive: true
            }).lean()

        ]);


        if (!shippingBoxes.length) {

            throw httpError(
                500,
                "No active shipping packages configured"
            );
        }


        /*
         * 5. Create maps
         */

        const productMap =
            new Map(
                products.map(
                    product => [
                        product._id.toString(),
                        product
                    ]
                )
            );


        const shippingMap =
            new Map(
                productShipping.map(
                    shipping => [
                        shipping.product.toString(),
                        shipping
                    ]
                )
            );


        /*
         * 6. Prepare packing items
         */

        const packingItems = [];


        for (
            const cartItem
            of cartItems
        ) {

            const product =
                productMap.get(
                    cartItem.product.toString()
                );


            if (!product) {

                throw httpError(
                    400,
                    "A product in your cart is no longer available"
                );
            }


            const shipping =
                shippingMap.get(
                    cartItem.product.toString()
                );


            if (!shipping) {

                throw httpError(
                    400,
                    `Shipping details are missing for ${product.name}`
                );
            }


            packingItems.push({

                product:
                    product._id,

                name:
                    product.name,

                qty:
                    cartItem.qty,

                weight:
                    shipping.weight,

                length:
                    shipping.length,

                width:
                    shipping.width,

                height:
                    shipping.height

            });
        }


        /*
         * 7. Run packaging engine
         */

        const packages =
            createPackages(
                packingItems,
                shippingBoxes
            );


        /*
         * 8. Pickup location
         */

        const pickupPincode =
            process.env
                .SHIPMENT_PICKUP_PINCODE;


        if (!pickupPincode) {

            throw httpError(
                500,
                "Shipment pickup pincode is not configured"
            );
        }


        /*
         * 9. Return shipping data
         */

        return {

            pickup: {
                pincode:
                    pickupPincode
            },

            delivery: {

                name:
                    address.name,

                phone:
                    address.phone,

                addressLine1:
                    address.addressLine1,

                addressLine2:
                    address.addressLine2,

                landmark:
                    address.landmark,

                city:
                    address.city,

                state:
                    address.state,

                country:
                    address.country,

                pincode:
                    address.pincode
            },

            packages
        };
    };



export const getShippingRatesService =
    async (
        userId,
        data
    ) => {

        const {
            deliveryPincode
        } = data;


        /*
         * 1. Validate pincode
         */

        if (!deliveryPincode) {

            throw httpError(
                400,
                "Delivery pincode is required"
            );
        }


        if (
            !/^\d{6}$/.test(
                deliveryPincode
            )
        ) {

            throw httpError(
                400,
                "Invalid delivery pincode"
            );
        }


        /*
         * 2. Get trusted packages
         */

        const shippingData =
            await prepareShippingService(
                userId
            );


        const packages =
            shippingData.packages;


        if (
            !packages ||
            !packages.length
        ) {

            throw httpError(
                400,
                "No packages found"
            );
        }


        /*
         * 3. Pickup pincode
         */

        const pickupPincode =
            process.env
                .SHIPMENT_PICKUP_PINCODE;


        if (!pickupPincode) {

            throw httpError(
                500,
                "Shipment pickup pincode is not configured"
            );
        }


        /*
         * 4. Get Shiprocket rates
         */

        const rates =
            await getShiprocketRates({

                pickupPincode,

                deliveryPincode,

                packages

            });


        /*
         * 5. Create shipping quote
         *
         * Quote valid for 10 minutes
         */

        const expiresAt =
            new Date(
                Date.now() +
                10 * 60 * 1000
            );


        const quote =
            await ShippingQuote.create({

                user: userId,

                pickupPincode,

                deliveryPincode,

                packages,

                rates,

                expiresAt

            });


        /*
         * 6. Return rates to frontend
         */

        return {

            quoteId:
                quote._id,

            pickupPincode,

            deliveryPincode,

            packages,

            rates,

            expiresAt

        };
    };

export const getSelectedShippingRate =
    async (
        userId,
        quoteId,
        courierId
    ) => {

        if (
            !mongoose.Types.ObjectId.isValid(
                quoteId
            )
        ) {
            throw httpError(
                400,
                "Invalid shipping quote ID"
            );
        }


        if (!courierId) {

            throw httpError(
                400,
                "Shipping courier is required"
            );
        }


        const quote =
            await ShippingQuote.findOne({
                _id: quoteId,
                user: userId
            }).lean();


        if (!quote) {

            throw httpError(
                400,
                "Shipping quote not found"
            );
        }


        if (
            new Date(
                quote.expiresAt
            ) < new Date()
        ) {

            throw httpError(
                400,
                "Shipping quote has expired"
            );
        }


        const selectedRate =
            quote.rates.find(
                rate =>
                    Number(
                        rate.courierId
                    ) ===
                    Number(
                        courierId
                    )
            );


        if (!selectedRate) {

            throw httpError(
                400,
                "Selected courier is not available"
            );
        }


        return {

            pickupPincode:
                quote.pickupPincode,

            deliveryPincode:
                quote.deliveryPincode,

            courierId:
                selectedRate.courierId,

            courierName:
                selectedRate.courierName,

            shippingCharge:
                selectedRate.totalCharge,

            estimatedDelivery:
                new Date(
                    selectedRate.estimatedDays
                ),

            packages:
                quote.packages
        };
    };