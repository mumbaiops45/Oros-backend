import {
    getOptionsService,
    createOptionService,
    updateOptionService,
    deleteOptionService
} from "../services/productOption.service.js";

export const getOptions = async (req, res) => {

    const {
        message,
        data
    } = await getOptionsService(req.params.productId);

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const createOption = async (req, res) => {

    const {
        message,
        data
    } = await createOptionService(req.params.productId, req.body);

    res.status(201).json({
        success: true,
        message,
        data
    });
};

export const updateOption = async (req, res) => {

    const {
        message,
        data
    } = await updateOptionService(
        req.params.productId,
        req.params.optionId,
        req.body
    );

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const deleteOption = async (req, res) => {

    const {
        message,
        data
    } = await deleteOptionService(
        req.params.productId,
        req.params.optionId
    );

    res.status(200).json({
        success: true,
        message,
        data
    });
};
