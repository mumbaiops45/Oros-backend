import Address from "../models/address.model.js";
import httpError from "../utils/httpError.js";


export const upsertAddressService =
    async (userId, data) => {

        const {
            name,
            phone,
            addressLine1,
            addressLine2,
            landmark,
            city,
            state,
            country,
            pincode,
            latitude,
            longitude
        } = data;


        if (!name) {
            throw httpError(
                400,
                "Name is required"
            );
        }


        if (!phone) {
            throw httpError(
                400,
                "Phone is required"
            );
        }


        if (!addressLine1) {
            throw httpError(
                400,
                "Address is required"
            );
        }


        if (!city) {
            throw httpError(
                400,
                "City is required"
            );
        }


        if (!state) {
            throw httpError(
                400,
                "State is required"
            );
        }


        if (!pincode) {
            throw httpError(
                400,
                "Pincode is required"
            );
        }


        const address =
            await Address.findOneAndUpdate(
                {
                    user: userId
                },
                {
                    $set: {
                        user: userId,
                        name,
                        phone,
                        addressLine1,
                        addressLine2,
                        landmark,
                        city,
                        state,
                        country:
                            country || "India",
                        pincode,
                        latitude:
                            latitude ?? null,
                        longitude:
                            longitude ?? null
                    }
                },
                {
                    new: true,
                    upsert: true,
                    runValidators: true,
                    setDefaultsOnInsert: true
                }
            );


        return {
            message:
                "Address saved successfully",

            data: {
                address
            }
        };
    };



export const getAddressService =
    async (userId) => {

        const address =
            await Address.findOne({
                user: userId
            }).lean();


        return {
            message:
                address
                    ? "Address fetched successfully"
                    : "Address not found",

            data: {
                address: address || null
            }
        };
    };



export const updateAddressService =
    async (userId, data) => {

        const address =
            await Address.findOneAndUpdate(
                {
                    user: userId
                },
                {
                    $set: data
                },
                {
                    new: true,
                    runValidators: true
                }
            );


        if (!address) {
            throw httpError(
                404,
                "Address not found"
            );
        }


        return {
            message:
                "Address updated successfully",

            data: {
                address
            }
        };
    };



export const deleteAddressService =
    async (userId) => {

        const address =
            await Address.findOneAndDelete({
                user: userId
            });


        if (!address) {
            throw httpError(
                404,
                "Address not found"
            );
        }


        return {
            message:
                "Address deleted successfully"
        };
    };