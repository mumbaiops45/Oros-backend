import {
    getProductsService,
    createProductService,
    getProductByIdService,
    updateProductService,
    deleteProductService
} from "../services/product.service.js";

export const getProducts = async (req, res) => {

    const {
        message,
        data
    } = await getProductsService(req.query);

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const getProductById = async (req, res) => {

    const {
        message,
        data
    } = await getProductByIdService(req.params.id);

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const createProduct = async (req, res) => {

    const {
        message,
        data
    } = await createProductService(req.body);

    res.status(201).json({
        success: true,
        message,
        data
    });
};

export const updateProduct = async (req, res) => {

    const {
        message,
        data
    } = await updateProductService(req.params.id, req.body);

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const deleteProduct = async (req, res) => {

    const {
        message,
        data
    } = await deleteProductService(req.params.id);

    res.status(200).json({
        success: true,
        message,
        data
    });
};
