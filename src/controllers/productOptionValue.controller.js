import {
    getOptionValuesService,
    createOptionValueService,
    updateOptionValueService,
    deleteOptionValueService
} from "../services/productOptionValue.service.js";

export const getOptionValues = async (req, res) => {

    const {
        message,
        data
    } = await getOptionValuesService(req.params.optionId);

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const createOptionValue = async (req, res) => {

    const {
        message,
        data
    } = await createOptionValueService(
        req.params.optionId,
        req.body
    );

    res.status(201).json({
        success: true,
        message,
        data
    });
};

export const updateOptionValue = async (req, res) => {

    const {
        message,
        data
    } = await updateOptionValueService(
        req.params.optionId,
        req.params.valueId,
        req.body
    );

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const deleteOptionValue = async (req, res) => {

    const {
        message,
        data
    } = await deleteOptionValueService(
        req.params.optionId,
        req.params.valueId
    );

    res.status(200).json({
        success: true,
        message,
        data
    });
};
