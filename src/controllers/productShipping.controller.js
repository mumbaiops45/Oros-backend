import {
    createProductShippingService,
    getAllProductShippingService,
    getProductShippingByProductService,
    updateProductShippingService,
    deleteProductShippingService
} from "../services/productShipping.service.js";


export const createProductShippingController =
    async (req, res) => {

        const result =
            await createProductShippingService(
                req.query.productId,
                req.body
            );

        return res
            .status(201)
            .json(result);
    };


export const getAllProductShippingController =
    async (req, res) => {

        const result =
            req.query.productId
                ? await getProductShippingByProductService(
                    req.query.productId
                )
                : await getAllProductShippingService();

        return res
            .status(200)
            .json(result);
    };


export const getProductShippingByProductController =
    async (req, res) => {

        const result =
            await getProductShippingByProductService(
                req.query.productId
            );

        return res
            .status(200)
            .json(result);
    };



export const updateProductShippingController =
    async (req, res) => {

        const result =
            await updateProductShippingService(
                req.params.id,
                req.body
            );

        return res
            .status(200)
            .json(result);
    };



export const deleteProductShippingController =
    async (req, res) => {

        const result =
            await deleteProductShippingService(
                req.params.id
            );

        return res
            .status(200)
            .json(result);
    };