import {
    createShippingPackageService,
    getAllShippingPackagesService,
    getShippingPackageByIdService,
    updateShippingPackageService,
    deleteShippingPackageService
} from "../services/shippingPackage.service.js";


export const createShippingPackageController =
    async (req, res) => {

        const result =
            await createShippingPackageService(
                req.body
            );

        return res
            .status(201)
            .json(result);
    };



export const getAllShippingPackagesController =
    async (req, res) => {

        const result =
            await getAllShippingPackagesService();

        return res
            .status(200)
            .json(result);
    };



export const getShippingPackageByIdController =
    async (req, res) => {

        const result =
            await getShippingPackageByIdService(
                req.params.id
            );

        return res
            .status(200)
            .json(result);
    };



export const updateShippingPackageController =
    async (req, res) => {

        const result =
            await updateShippingPackageService(
                req.params.id,
                req.body
            );

        return res
            .status(200)
            .json(result);
    };



export const deleteShippingPackageController =
    async (req, res) => {

        const result =
            await deleteShippingPackageService(
                req.params.id
            );

        return res
            .status(200)
            .json(result);
    };