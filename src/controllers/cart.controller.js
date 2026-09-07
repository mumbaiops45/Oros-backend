// src/controllers/cart.controller.js

import {
    addToCartService,
    getCartService,
    updateCartQuantityService,
    removeCartItemService,
    clearCartService,
    getAllCartService
} from "../services/cart.service.js";


export const addToCartController = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await addToCartService(
                req.user.id,
                req.body
            );

        return res
            .status(201)
            .json(result);

    } catch (error) {

        next(error);

    }
};


export const getCartController = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await getCartService(
                req.user.id
            );

        return res
            .status(200)
            .json(result);

    } catch (error) {

        next(error);

    }
};

export const getAllCartController= async(req,res)=>{
    const {message,data}= await getAllCartService()
    res.json({
        success:true,
        message,
        data
    })
}


export const updateCartQuantityController = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await updateCartQuantityService(
                req.user.id,
                req.params.id,
                req.body.qty
            );

        return res
            .status(200)
            .json(result);

    } catch (error) {

        next(error);

    }
};


export const removeCartItemController = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await removeCartItemService(
                req.user.id,
                req.params.id
            );

        return res
            .status(200)
            .json(result);

    } catch (error) {

        next(error);

    }
};


export const clearCartController = async (
    req,
    res,
    next
) => {

    try {

        const result =
            await clearCartService(
                req.user.id
            );

        return res
            .status(200)
            .json(result);

    } catch (error) {

        next(error);

    }
};
