import ProductShipping from "../models/productShipping.model.js";
import Product from "../models/product.model.js";
import httpError from "../utils/httpError.js";


export const createProductShippingService = async (
    productId,
    data
) => {

    const {
        weight,
        length,
        width,
        height
    } = data;


    if (!productId) {
        throw httpError(
            400,
            "Product id is required"
        );
    }


    const productExists =
        await Product.exists({
            _id: productId
        });


    if (!productExists) {
        throw httpError(
            404,
            "Product not found"
        );
    }


    const existing =
        await ProductShipping.findOne({
            product: productId
        });


    if (existing) {
        throw httpError(
            409,
            "Shipping details already exist for this product"
        );
    }


    const shipping =
        await ProductShipping.create({
            product: productId,
            weight,
            length,
            width,
            height
        });


    return {
        message:
            "Product shipping details created successfully",

        data: {
            shipping
        }
    };
};



export const getAllProductShippingService =
    async () => {

        const shipping =
            await ProductShipping.find()
                .populate(
                    "product",
                    "name sku slug basePrice"
                )
                .sort({
                    createdAt: -1
                })
                .lean();


        return {
            message:
                "Product shipping details fetched successfully",

            data: {
                shipping
            }
        };
    };



export const getProductShippingByProductService =
    async (productId) => {

        if (!productId) {
            throw httpError(
                400,
                "Product id is required"
            );
        }


        const shipping =
            await ProductShipping.findOne({
                product: productId
            })
                .populate(
                    "product",
                    "name sku slug"
                )
                .lean();


        if (!shipping) {
            throw httpError(
                404,
                "Product shipping details not found"
            );
        }


        return {
            message:
                "Product shipping details fetched successfully",

            data: {
                shipping
            }
        };
    };



export const updateProductShippingService =
    async (id, data) => {

        const shipping =
            await ProductShipping.findByIdAndUpdate(
                id,
                {
                    $set: data
                },
                {
                    new: true,
                    runValidators: true
                }
            );


        if (!shipping) {
            throw httpError(
                404,
                "Product shipping details not found"
            );
        }


        return {
            message:
                "Product shipping details updated successfully",

            data: {
                shipping
            }
        };
    };



export const deleteProductShippingService =
    async (id) => {

        const shipping =
            await ProductShipping.findByIdAndDelete(
                id
            );


        if (!shipping) {
            throw httpError(
                404,
                "Product shipping details not found"
            );
        }


        return {
            message:
                "Product shipping details deleted successfully"
        };
    };