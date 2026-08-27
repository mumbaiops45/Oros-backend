import Quotation from "../models/quotation.model.js";
import QuotationItem from "../models/quotationItem.model.js";
import QuotationFile from "../models/quotationFile.model.js";
import QuotationMessage from "../models/quotationMessage.model.js";
import User from "../models/User.model.js";


export const createQuotationService = async (userId, data) => {

    if (!userId) {
        throw new Error("userId required");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("user not found");
    }


    // Generate quotation number
    const refNumber = `QTN-${Date.now()}`;


    // 1. Create quotation
    const quotation = await Quotation.create({

        refNumber,

        customer: userId,

        type: data.type,

        name: data.name,

        phone: data.phone,

        email: data.email,

        company: data.company,

        taxRegNo: data.taxRegNo,

        requirements: data.requirements,

        deadline: data.deadline

    });


    // 2. Create quotation item
    const quotationItem = await QuotationItem.create({

        quotation: quotation._id,

        product: data.productId,

        qty: Number(data.qty)

    });


    // 3. Create quotation files
    const quotationFiles = [];

    for (const file of data.files) {

        const quotationFile =
            await QuotationFile.create({

                quotation: quotation._id,

                fileUrl: file.path,

                fileName: file.originalname,

                mime: file.mimetype,

                size: file.size

            });

        quotationFiles.push(
            quotationFile
        );
    }


    // 4. Create initial quotation message
    let quotationMessage = null;

    if (data.message) {

        quotationMessage =
            await QuotationMessage.create({

                quotation: quotation._id,

                sender: "CUSTOMER",

                message: data.message

            });

    }


    return {

        message: "Quotation created successfully",

        data: {

            quotation,

            quotationItem,

            quotationFiles,

            quotationMessage

        }

    };

};

export const updateQuotationService = async (
    quotationId,
    userId,
    data
) => {

    if (!quotationId) {
        throw new Error("Quotation id required");
    }

    const quotation = await Quotation.findOne({
        _id: quotationId,
        customer: userId
    });

    if (!quotation) {
        throw new Error("Quotation not found");
    }


    /*
    --------------------------------
    Update quotation
    --------------------------------
    */

    const quotationData = {};

    if (data.name !== undefined) {
        quotationData.name = data.name;
    }

    if (data.phone !== undefined) {
        quotationData.phone = data.phone;
    }

    if (data.email !== undefined) {
        quotationData.email = data.email;
    }

    if (data.company !== undefined) {
        quotationData.company = data.company;
    }

    if (data.taxRegNo !== undefined) {
        quotationData.taxRegNo = data.taxRegNo;
    }

    if (data.requirements !== undefined) {
        quotationData.requirements = data.requirements;
    }

    if (data.deadline !== undefined) {
        quotationData.deadline = data.deadline;
    }


    if (Object.keys(quotationData).length > 0) {

        await Quotation.findByIdAndUpdate(
            quotationId,
            quotationData,
            {
                new: true,
                runValidators: true
            }
        );
    }


    /*
    --------------------------------
    Update quotation item
    --------------------------------
    */

    if (
        data.productId !== undefined ||
        data.qty !== undefined
    ) {

        const item = await QuotationItem.findOne({
            quotation: quotationId
        });

        if (!item) {
            throw new Error("Quotation item not found");
        }


        const itemData = {};

        if (data.productId !== undefined) {
            itemData.product = data.productId;
        }

        if (data.qty !== undefined) {

            const qty = Number(data.qty);

            if (!Number.isInteger(qty) || qty < 1) {
                throw new Error("Quantity must be at least 1");
            }

            itemData.qty = qty;
        }


        await QuotationItem.findByIdAndUpdate(
            item._id,
            itemData,
            {
                new: true,
                runValidators: true
            }
        );
    }


    /*
    --------------------------------
    Add customer files
    --------------------------------
    */

    const files = [];

    if (data.files && data.files.length > 0) {

        for (const file of data.files) {

            const quotationFile =
                await QuotationFile.create({
                    quotation: quotationId,
                    fileUrl: file.path,
                    fileName: file.originalname,
                    mime: file.mimetype,
                    size: file.size
                });

            files.push(quotationFile);
        }
    }


    /*
    --------------------------------
    Add customer message
    --------------------------------
    */

    let message = null;

    if (data.message) {

        message = await QuotationMessage.create({
            quotation: quotationId,
            sender: "CUSTOMER",
            message: data.message
        });
    }


    const updatedQuotation =
        await Quotation.findById(quotationId);

    const updatedItem =
        await QuotationItem.findOne({
            quotation: quotationId
        });


    return {
        message: "Quotation updated successfully",

        data: {
            quotation: updatedQuotation,
            item: updatedItem,
            files,
            message
        }
    };
};

export const updateQuotationByAdminService = async (
    quotationId,
    data
) => {

    if (!quotationId) {
        throw new Error("Quotation id required");
    }


    const quotation =
        await Quotation.findById(quotationId);

    if (!quotation) {
        throw new Error("Quotation not found");
    }


    /*
    --------------------------------
    Calculate quotation total
    --------------------------------
    */

    const subTotal =
        data.subTotal !== undefined
            ? Number(data.subTotal)
            : quotation.subTotal;

    const tax =
        data.tax !== undefined
            ? Number(data.tax)
            : quotation.tax;

    const shipping =
        data.shipping !== undefined
            ? Number(data.shipping)
            : quotation.shipping;


    if (subTotal < 0 || tax < 0 || shipping < 0) {
        throw new Error(
            "SubTotal, tax and shipping cannot be negative"
        );
    }


    const total =
        subTotal +
        tax +
        shipping;


    /*
    --------------------------------
    Update quotation
    --------------------------------
    */

    const quotationData = {

        subTotal,

        tax,

        shipping,

        total,

        version: quotation.version + 1,

        status: "QUOTED"
    };


    if (data.validTill !== undefined) {
        quotationData.validTill = data.validTill;
    }


    const updatedQuotation =
        await Quotation.findByIdAndUpdate(
            quotationId,
            quotationData,
            {
                new: true,
                runValidators: true
            }
        );


    /*
    --------------------------------
    Update quotation item
    --------------------------------
    */

    let updatedItem = null;

    if (
        data.unitPrice !== undefined ||
        data.itemTax !== undefined
    ) {

        const item =
            await QuotationItem.findOne({
                quotation: quotationId
            });

        if (!item) {
            throw new Error(
                "Quotation item not found"
            );
        }


        const unitPrice =
            data.unitPrice !== undefined
                ? Number(data.unitPrice)
                : item.unitPrice;

        const itemTax =
            data.itemTax !== undefined
                ? Number(data.itemTax)
                : item.tax;


        const amount =
            (unitPrice * item.qty) +
            itemTax;


        updatedItem =
            await QuotationItem.findByIdAndUpdate(
                item._id,
                {
                    unitPrice,
                    tax: itemTax,
                    amount
                },
                {
                    new: true,
                    runValidators: true
                }
            );
    }


    /*
    --------------------------------
    Admin message
    --------------------------------
    */

    let message = null;

    if (data.message) {

        message =
            await QuotationMessage.create({
                quotation: quotationId,
                sender: "ADMIN",
                message: data.message
            });
    }


    return {

        message: "Quotation sent successfully",

        data: {
            quotation: updatedQuotation,
            item: updatedItem,
            message
        }
    };
};