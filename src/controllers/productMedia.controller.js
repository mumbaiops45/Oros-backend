import {
    getMediaService,
    createMediaService,
    updateMediaService,
    deleteMediaService
} from "../services/productMedia.service.js";

export const getMedia = async (req, res) => {

    const {
        message,
        data
    } = await getMediaService(req.params.productId);

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const createMedia = async (req, res) => {

    const {
        message,
        data
    } = await createMediaService(
        req.params.productId,
        req.file,
        req.body
    );

    res.status(201).json({
        success: true,
        message,
        data
    });
};

export const updateMedia = async (req, res) => {

    const {
        message,
        data
    } = await updateMediaService(
        req.params.productId,
        req.params.mediaId,
        req.body
    );

    res.status(200).json({
        success: true,
        message,
        data
    });
};

export const deleteMedia = async (req, res) => {

    const {
        message,
        data
    } = await deleteMediaService(
        req.params.productId,
        req.params.mediaId
    );

    res.status(200).json({
        success: true,
        message,
        data
    });
};
