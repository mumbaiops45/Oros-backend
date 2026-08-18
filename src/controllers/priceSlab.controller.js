import {
    getPriceSlabsService,
    createPriceSlabService,
    updatePriceSlabService,
    deletePriceSlabService
} from "../services/priceSlab.service.js";

export const getPriceSlabs = async (req, res) => {

    const {
        message,
        data
    } = await getPriceSlabsService(req.params.productId);

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const createPriceSlab = async (req, res) => {

    const {
        message,
        data
    } = await createPriceSlabService(
        req.params.productId,
        req.body
    );

    res.status(201).json({
        success: true,
        message,
        data
    });
};

export const updatePriceSlab = async (req, res) => {

    const {
        message,
        data
    } = await updatePriceSlabService(
        req.params.productId,
        req.params.slabId,
        req.body
    );

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const deletePriceSlab = async (req, res) => {

    const {
        message,
        data
    } = await deletePriceSlabService(
        req.params.productId,
        req.params.slabId
    );

    res.status(200).json({
        success: true,
        message,
        data
    });
};
