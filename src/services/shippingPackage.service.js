import ShippingPackage
    from "../models/shippingPackage.model.js";

import httpError
    from "../utils/httpError.js";


export const createShippingPackageService =
    async (data) => {

        const {
            name,
            maxWeight,
            length,
            width,
            height,
            isActive
        } = data;


        if (!name) {
            throw httpError(
                400,
                "Package name is required"
            );
        }


        const shippingPackage =
            await ShippingPackage.create({
                name,
                maxWeight,
                length,
                width,
                height,
                isActive
            });


        return {
            message:
                "Shipping package created successfully",

            data: {
                shippingPackage
            }
        };
    };



export const getAllShippingPackagesService =
    async () => {

        const shippingPackages =
            await ShippingPackage.find()
                .sort({
                    createdAt: -1
                })
                .lean();


        return {
            message:
                "Shipping packages fetched successfully",

            data: {
                shippingPackages
            }
        };
    };



export const getShippingPackageByIdService =
    async (id) => {

        const shippingPackage =
            await ShippingPackage.findById(id)
                .lean();


        if (!shippingPackage) {
            throw httpError(
                404,
                "Shipping package not found"
            );
        }


        return {
            message:
                "Shipping package fetched successfully",

            data: {
                shippingPackage
            }
        };
    };



export const updateShippingPackageService =
    async (id, data) => {

        const shippingPackage =
            await ShippingPackage.findByIdAndUpdate(
                id,
                {
                    $set: data
                },
                {
                    new: true,
                    runValidators: true
                }
            );


        if (!shippingPackage) {
            throw httpError(
                404,
                "Shipping package not found"
            );
        }


        return {
            message:
                "Shipping package updated successfully",

            data: {
                shippingPackage
            }
        };
    };



export const deleteShippingPackageService =
    async (id) => {

        const shippingPackage =
            await ShippingPackage.findByIdAndDelete(
                id
            );


        if (!shippingPackage) {
            throw httpError(
                404,
                "Shipping package not found"
            );
        }


        return {
            message:
                "Shipping package deleted successfully"
        };
    };