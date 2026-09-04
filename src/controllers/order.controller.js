import {
    createOrderService,
    getMyOrdersService,
    getAdminOrdersService,
    createManualOrderService,
        createQuotationOrderService,
        cancelStoreOrderService,
        updateStoreOrderStatusService
    
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

export const createQuotationOrderController =
    async (req, res) => {

        const {
            quotationId
        } = req.params;

        const result =
            await createQuotationOrderService(
                req.user.id,
                quotationId
            );

        res.status(201).json({
            success: true,
            ...result
        });
    };

    export const cancelStoreOrderController =
    async (req, res) => {

        const {
            id
        } = req.params;

        const result =
            await cancelStoreOrderService(
                id,
                req.user.id
            );

        return res
            .status(200)
            .json({
                success: true,
                ...result
            });
    };


// ==========================================
// ADMIN UPDATE STORE ORDER STATUS
// ==========================================

export const updateStoreOrderStatusController =
    async (req, res) => {

        const {
            id
        } = req.params;

        const {
            status
        } = req.body;

        const result =
            await updateStoreOrderStatusService(
                id,
                status
            );

        return res
            .status(200)
            .json({
                success: true,
                ...result
            });
    };