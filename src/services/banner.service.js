import Banner from "../models/banner.model.js";
import cloudinary from "../config/cloudinary.js";


export const createBannerService = async (data) => {
    const banner = await Banner.create(data);
    return {
        message: "banner created",
        data: {
            banner
        }
    }

}

export const updateBannerByIdService = async (bannerId, data) => {
    if (!bannerId) {
        throw new Error("BannerId is required");
    };
    const banner = await Banner.findById(bannerId);
    if (!banner) {
        throw new Error("Banner not exist");

    };

    if (
        data.order !== undefined &&
        data.order !== banner.order
    ) {

     
        if (data.order < banner.order) {

            await Banner.updateMany(
                {
                    _id: { $ne: bannerId },
                    type: banner.type,
                    order: {
                        $gte: data.order,
                        $lt: banner.order
                    }
                },
                {
                    $inc: {
                        order: 1
                    }
                }
            );

        }


        else {

            await Banner.updateMany(
                {
                    _id: { $ne: bannerId },
                    type: banner.type,
                    order: {
                        $gt: banner.order,
                        $lte: data.order
                    }
                },
                {
                    $inc: {
                        order: -1
                    }
                }
            );
        }
    }
    let oldMediaUrlDesktopPublicId
    let oldMediaUrlMobilePublicId
    if (data.mediaUrlDesktop) {
        oldMediaUrlDesktopPublicId = banner.mediaUrlDesktopPublicId
    }
    if (data.mediaUrlMobile) {
        oldMediaUrlMobilePublicId = banner.mediaUrlMobilePublicId
    }
    const updatedBanner = await Banner.findByIdAndUpdate(bannerId, data, {
        new: true,
        runValidators: true
    })
    if (oldMediaUrlDesktopPublicId) {
        await cloudinary.uploader.destroy(oldMediaUrlDesktopPublicId);
    }
    if (oldMediaUrlMobilePublicId) {
        await cloudinary.uploader.destroy(oldMediaUrlMobilePublicId);
    }


    return {
        message: "banner is updated",
        data: {
            updatedBanner
        }
    }


}


/*
--------------------------------
Listing

Newest position first is meaningless for a banner, so these come back in
the order they are shown in: by type, then by the position the admin gave
them. ?type= narrows it to one strip and ?isActive=true drops the ones
that have been taken down.
--------------------------------
*/
export const getBannersService = async (query = {}) => {

    const filter = {};

    if (query.type) {
        filter.type = query.type;
    }

    if (query.isActive !== undefined) {
        filter.isActive = query.isActive === "true" || query.isActive === true;
    }

    const banners = await Banner.find(filter)
        .sort({ type: 1, order: 1 })
        .lean();

    return {
        message: "banner list",
        data: {
            banners
        }
    }
}
