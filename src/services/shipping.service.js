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

export const prepareShippingService =
    async (userId) => {

        /*
            1. Get customer address
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
            2. Get cart
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
            3. Get product IDs
        */

        const productIds =
            cartItems.map(
                item => item.product
            );


        /*
            4. Get everything together
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
            5. Create maps
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
            6. Prepare packing items
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
                    `A product ${product} in your cart is no longer available`
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
            7. Run Packaging Engine
        */

        const packages =
            createPackages(
                packingItems,
                shippingBoxes
            );


        /*
            8. Pickup location

            This should NOT come
            from customer.

            It comes from ENV/config.
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
            9. Return everything required
               by shipping aggregator.
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
                    address.pincode,

                // latitude:
                //     address.latitude,

                // longitude:
                //     address.longitude
            },

            packages
        };
    };

    export const getShippingRatesService =
    async (userId, data) => {

        const {
            deliveryPincode
        } = data;


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
         * Get trusted shipping data
         * from server
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
         * Call Shiprocket
         */

        const rates =
            await getShiprocketRates({
                pickupPincode,
                deliveryPincode,
                packages
            });


        return {

            pickupPincode,

            deliveryPincode,

            packages,

            rates
        };
    };