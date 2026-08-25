import {
    createOrderService,
    getMyOrdersService,
    getAdminOrdersService,
    createManualOrderService,
    
} from "../services/order.service.js";


export const createOrderController =
    async (
        req,
        res
    ) => {

        const result =
            await createOrderService(
                req.user.id,
                req.body
            );

        return res
            .status(201)
            .json(result);
    };


export const getMyOrdersController =
    async (
        req,
        res
    ) => {

        const result =
            await getMyOrdersService(
                req.user.id
            );

        return res
            .status(200)
            .json(result);
    };

export const getAdminOrdersController =
    async (req, res) => {

        const result =
            await getAdminOrdersService(
                req.query.userId
            );

        return res
            .status(200)
            .json(result);
    };


export const createManualOrder = async (req, res) => {
    const { message, data } = await createManualOrderService(req.body, req.user);
    res.json({
        message,
        success: true,
        data
    })
}