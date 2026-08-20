import {
    prepareShippingService
} from "../services/shipping.service.js";


export const prepareShippingController =
    async (req, res) => {

        const result =
            await prepareShippingService(
                req.user.id
            );

        return res
            .status(200)
            .json({
                message:
                    "Shipping data prepared successfully",

                data: result
            });
    };