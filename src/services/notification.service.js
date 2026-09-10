import mongoose from "mongoose";
import Notification from "../models/notification.model.js";

export const getNotificationsService = async (userId,{page=1,limit=6,isRead}) => {
 page= Number(page);
 limit= Number(limit);
const skip=(page-1)*limit;
let filter ={recipient: userId};

if (isRead!==undefined) {
    filter.isRead=isRead==="true";
}
    if (!userId) {
        throw new Error("User id required");
    }

    const notifications = await Notification.find(filter).skip(skip).limit(limit)
        .sort({ createdAt: -1 });

    return {
        message: "Notifications fetched successfully",
        data: notifications
    };
};
export const updateNotificationReadService = async (id,userId) => {
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid notification id");
    }
    const notification = await Notification.findOneAndUpdate({
        _id: id,
        recipient: userId
    
    },
    {
        isRead:true
    },

        {
            new: true,
            runValidators: true
        }
    );
    if (!notification) {
        throw new Error("notification not found");

    }
    return {
        message: "You read the notification succesfully",
        data: {
            notification
        }
    }
}
export const deleteNotificationByIdService = async (id,userId) => {

    
    if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid notification id");
    }
    const notification = await Notification.findOneAndDelete({
        _id:id,
        recipient:userId
    });
    if (!notification) {
        throw new Error("notification not found");

    }
    return {
        message: "notification delete succesfully",
        data: {
            notification
        }
    }

}

export const clearNotificationService = async (userid,{isRead}) => {
    let filter={ recipient: userid};
if (isRead!==undefined) {
    filter.isRead=isRead==="true"
}
    
    const notifications = await Notification.deleteMany(filter);
    return {
        message: "clear successfully",
        data: {
            deletedCount: notifications.deletedCount
        }
    }
}

