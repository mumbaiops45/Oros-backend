// src/services/cart.service.js

import Cart from "../models/cart.model.js";
import Product from "../models/product.model.js";
import httpError from "../utils/httpError.js";


const createVariantKey = (
    selectedOptions = [],
    personalisation = {}
) => {

    const sortedOptions = [...selectedOptions].sort(
        (a, b) => a.name.localeCompare(b.name)
    );

    return JSON.stringify({
        selectedOptions: sortedOptions,
        personalisation
    });
};


const validateSelectedOptions = (
    selectedOptions
) => {

    if (!Array.isArray(selectedOptions)) {
        throw httpError(
            400,
            "selectedOptions must be an array"
        );
    }


    for (const option of selectedOptions) {

        if (!option.name) {
            throw httpError(
                400,
                "Option name is required"
            );
        }

        if (
            option.value === undefined ||
            option.value === null ||
            option.value === ""
        ) {
            throw httpError(
                400,
                `Value is required for ${option.name}`
            );
        }
    }
};


const validatePersonalisation = (
    personalisation
) => {

    if (
        personalisation === null ||
        typeof personalisation !== "object" ||
        Array.isArray(personalisation)
    ) {
        throw httpError(
            400,
            "personalisation must be an object"
        );
    }

};


export const addToCartService = async (
    userId,
    {
        product,
        qty,
        selectedOptions = [],
        personalisation = {}
    }
) => {

    if (!product) {
        throw httpError(
            400,
            "product is required"
        );
    }


    const productData =
        await Product.findById(product).lean();


    if (!productData) {
        throw httpError(
            404,
            "Product not found"
        );
    }


    if (productData.status !== "PUBLISHED") {
        throw httpError(
            400,
            "Product is not available"
        );
    }


    const quantity = Number(qty);


    if (
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {
        throw httpError(
            400,
            "Quantity must be at least 1"
        );
    }


    const minQty =
        productData.minQty ?? 1;


    if (quantity < minQty) {
        throw httpError(
            400,
            `Minimum quantity for this product is ${minQty}`
        );
    }


    validateSelectedOptions(
        selectedOptions
    );


    validatePersonalisation(
        personalisation
    );


    const variantKey =
        createVariantKey(
            selectedOptions,
            personalisation
        );


    const existingCartItem =
        await Cart.findOne({
            user: userId,
            product,
            variantKey
        });


    if (existingCartItem) {

        existingCartItem.qty += quantity;


        existingCartItem.unitPrice =
            productData.basePrice;


        existingCartItem.taxRate =
            productData.taxRate ?? 0;


        await existingCartItem.save();


        return {
            message: "Product quantity updated in cart",

            data: {
                cart: existingCartItem
            }
        };
    }


    const cart =
        await Cart.create({

            user: userId,

            product,

            qty: quantity,

            selectedOptions,

            personalisation,

            variantKey,

            unitPrice:
                productData.basePrice,

            taxRate:
                productData.taxRate ?? 0
        });


    return {
        message: "Product added to cart",

        data: {
            cart
        }
    };
};


export const getCartService = async (
    userId
) => {

    const cartItems =
        await Cart.find({
            user: userId
        })
            .populate(
                "product",
                "name slug basePrice minQty status"
            )
            .sort({
                createdAt: -1
            })
            .lean();


    return {
        message: "Cart fetched successfully",

        data: {
            items: cartItems
        }
    };
};


export const updateCartQuantityService = async (
    userId,
    cartId,
    qty
) => {

    const quantity = Number(qty);


    if (
        !Number.isInteger(quantity) ||
        quantity < 1
    ) {
        throw httpError(
            400,
            "Quantity must be at least 1"
        );
    }


    const cartItem =
        await Cart.findOne({
            _id: cartId,
            user: userId
        })
            .populate(
                "product",
                "name slug basePrice minQty status"
            );


    if (!cartItem) {
        throw httpError(
            404,
            "Cart item not found"
        );
    }


    if (!cartItem.product) {
        throw httpError(
            404,
            "Product not found"
        );
    }


    if (
        cartItem.product.status !== "PUBLISHED"
    ) {
        throw httpError(
            400,
            "Product is no longer available"
        );
    }


    const minQty =
        cartItem.product.minQty ?? 1;


    if (quantity < minQty) {
        throw httpError(
            400,
            `Minimum quantity for this product is ${minQty}`
        );
    }


    cartItem.qty = quantity;


    await cartItem.save();


    return {
        message: "Cart quantity updated successfully",

        data: {
            cart: cartItem
        }
    };
};


export const removeCartItemService = async (
    userId,
    cartId
) => {

    const cartItem =
        await Cart.findOneAndDelete({
            _id: cartId,
            user: userId
        });


    if (!cartItem) {
        throw httpError(
            404,
            "Cart item not found"
        );
    }


    return {
        message: "Product removed from cart",

        data: {
            cart: cartItem
        }
    };
};


export const clearCartService = async (
    userId
) => {

    await Cart.deleteMany({
        user: userId
    });


    return {
        message: "Cart cleared successfully"
    };
};
