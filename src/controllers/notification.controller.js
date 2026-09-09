import {
    getNotificationsService
} from "../services/notification.service.js";

export const getNotifications = async (req, res) => {

    const { message, data } =
        await getNotificationsService(req.user.id);

    res.status(200).json({
        success: true,
        message,
        data
    });
};