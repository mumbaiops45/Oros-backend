import {
    getNotificationsService,
    updateNotificationReadService,
    deleteNotificationByIdService,
    clearNotificationService
} from "../services/notification.service.js";

export const getNotifications = async (req, res) => {

    const { message, data } =
        await getNotificationsService(req.user.id, req.query);

    res.status(200).json({
        success: true,
        message,
        data
    });
};
export const updateNotificationRead = async (req, res) => {

    const { message, data } =
        await updateNotificationReadService(req.params.id,req.user.id);

    res.status(200).json({
        success: true,
        message,
        data
    });
};
export const deleteNotificationById = async (req, res) => {

    const { message, data } =
        await deleteNotificationByIdService(req.params.id,req.user.id);

    res.status(200).json({
        success: true,
        message,
        data
    });
};
export const  clearNotification = async (req, res) => {

    const { message, data } =
        await  clearNotificationService(req.user.id,req.query);

    res.status(200).json({
        success: true,
        message,
        data
    });
};