import {
    getSpecsService,
    createSpecService,
    updateSpecService,
    deleteSpecService
} from "../services/productSpec.service.js";

export const getSpecs = async (req, res) => {

    const {
        message,
        data
    } = await getSpecsService(req.params.productId);

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const createSpec = async (req, res) => {

    const {
        message,
        data
    } = await createSpecService(req.params.productId, req.body);

    res.status(201).json({
        success: true,
        message,
        data
    });
};

export const updateSpec = async (req, res) => {

    const {
        message,
        data
    } = await updateSpecService(
        req.params.productId,
        req.params.specId,
        req.body
    );

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const deleteSpec = async (req, res) => {

    const {
        message,
        data
    } = await deleteSpecService(
        req.params.productId,
        req.params.specId
    );

    res.status(200).json({
        success: true,
        message,
        data
    });
};
