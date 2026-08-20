import {
    upsertAddressService,
    getAddressService,
    updateAddressService,
    deleteAddressService
} from "../services/address.service.js";


export const upsertAddressController =
    async (req, res) => {

        const result =
            await upsertAddressService(
                req.user.id,
                req.body
            );

        return res
            .status(200)
            .json(result);
    };



export const getAddressController =
    async (req, res) => {

        const result =
            await getAddressService(
                req.user.id
            );

        return res
            .status(200)
            .json(result);
    };



export const updateAddressController =
    async (req, res) => {

        const result =
            await updateAddressService(
                req.user.id,
                req.body
            );

        return res
            .status(200)
            .json(result);
    };



export const deleteAddressController =
    async (req, res) => {

        const result =
            await deleteAddressService(
                req.user.id
            );

        return res
            .status(200)
            .json(result);
    };