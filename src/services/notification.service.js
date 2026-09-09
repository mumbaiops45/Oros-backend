import Notification from "../models/notification.model.js";

export const getNotificationsService = async (userId) => {

    if (!userId) {
        throw new Error("User id required");
    }

    const notifications = await Notification.find({
        recipient: userId
    })
        .sort({ createdAt: -1 });

    return {
        message: "Notifications fetched successfully",
        data: notifications
    };
};