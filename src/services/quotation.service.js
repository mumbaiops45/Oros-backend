import Quotation from "../models/quotation.model.js";
import QuotationItem from "../models/quotationItem.model.js";
import QuotationFile from "../models/quotationFile.model.js";
import QuotationMessage from "../models/quotationMessage.model.js";
import User from "../models/User.model.js";
import mongoose from "mongoose";


/*
--------------------------------
Line items

A quotation carries one line per product the customer asked about.
They arrive as `items` — JSON on the multipart create, a real array on
the admin route — and the older single productId/qty pair is still
accepted so nothing that already posts it has to change.
--------------------------------
*/

const parseList = (raw) => {

    if (!raw) {
        return [];
    }

    let value = raw;

    if (typeof value === "string") {

        try {
            value = JSON.parse(value);
        } catch {
            throw new Error("items must be valid JSON");
        }
    }

    return Array.isArray(value) ? value : [];
};


/*
The create route is multipart, so anything structured arrives as a
string. An object posted as JSON is read back here; one that already
came through as an object (the admin route is plain JSON) is passed
along untouched.
*/
const parseObject = (raw) => {

    if (!raw) {
        return null;
    }

    if (typeof raw !== "string") {
        return raw;
    }

    try {
        return JSON.parse(raw);
    } catch {
        throw new Error("shippingAddress must be valid JSON");
    }
};


const parseItems = (raw) => {

    return parseList(raw).map((item) => {

        const qty = Number(item.qty);

        if (!Number.isInteger(qty) || qty < 1) {
            throw new Error("Each item needs a quantity of at least 1");
        }

        return {
            product: item.productId || item.product || null,
            qty
        };
    });
};


export const createQuotationService = async (userId, data) => {

    if (!userId) {
        throw new Error("userId required");
    }

    const user = await User.findById(userId);

    if (!user) {
        throw new Error("user not found");
    }

    // Validate shipping address
    const shippingAddress = parseObject(data.shippingAddress);

    if (!shippingAddress) {
        throw new Error("Shipping address is required");
    }

    const {
        name,
        phone,
        addressLine1,
        addressLine2,
        city,
        state,
        country,
        pincode
    } = shippingAddress;

    if (
        !name ||
        !phone ||
        !addressLine1 ||
        !city ||
        !state ||
        !country ||
        !pincode
    ) {
        throw new Error("Complete shipping address is required");
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
        deadline: data.deadline,

        // Shipping address snapshot
        shippingAddress: {
            name,
            phone,
            addressLine1,
            addressLine2,
            city,
            state,
            country,
            pincode
        }
    });

    // 2. Create quotation items
    const lines = parseItems(data.items);

    const quotationItems = await QuotationItem.insertMany(
        lines.length > 0
            ? lines.map((line) => ({
                quotation: quotation._id,
                product: line.product,
                qty: line.qty
            }))
            : [
                {
                    quotation: quotation._id,
                    product: data.productId || null,
                    qty: Number(data.qty)
                }
            ]
    );

    const quotationItem = quotationItems[0];

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

        quotationFiles.push(quotationFile);
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
            quotationItems,
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
    if (data.status !== undefined) {
        if (data.status !== "CANCELLED") {
            throw new Error(
                "Customer can only cancel the quotation"
            );
        }

        const cancellableStatuses = [
            "PENDING",
            "IN_REVIEW",
            "QUOTED"
        ];

            if (!cancellableStatuses.includes(quotation.status)) {
            throw new Error(
                "Quotation cannot be cancelled in its current status"
            );
        }
        quotation.status = "CANCELLED";

        await quotation.save();

    }

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
    Validate status
    --------------------------------
    */

    const allowedStatuses = [
        "PENDING",
        "IN_REVIEW",
        "QUOTED",
        "ACCEPTED",
        "REJECTED",
        "EXPIRED",
        "CONVERTED",
        "CANCELLED"
    ];

    const status =
        data.status !== undefined
            ? data.status
            : quotation.status;

    if (!allowedStatuses.includes(status)) {
        throw new Error("Invalid quotation status");
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

    if (
        subTotal < 0 ||
        tax < 0 ||
        shipping < 0
    ) {
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
        status
    };

    /*
    --------------------------------
    Version
    --------------------------------

    Increase version only when admin
    actually sends a new quotation price.
    */

    if (
        data.subTotal !== undefined ||
        data.tax !== undefined ||
        data.shipping !== undefined ||
        data.items !== undefined
    ) {
        quotationData.version =
            quotation.version + 1;
    }

    if (data.validTill !== undefined) {
        quotationData.validTill =
            data.validTill;
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
    Update quotation items
    --------------------------------
    */

    const priced = parseList(data.items);

    if (
        priced.length === 0 &&
        (
            data.unitPrice !== undefined ||
            data.itemTax !== undefined
        )
    ) {

        const first =
            await QuotationItem.findOne({
                quotation: quotationId
            });

        if (!first) {
            throw new Error(
                "Quotation item not found"
            );
        }

        priced.push({
            id: first._id,
            unitPrice: data.unitPrice,
            tax: data.itemTax
        });
    }

    const updatedItems = [];

    for (const line of priced) {

        const item =
            await QuotationItem.findOne({
                _id: line.id || line._id,
                quotation: quotationId
            });

        if (!item) {
            throw new Error(
                "Quotation item not found"
            );
        }

        const unitPrice =
            line.unitPrice !== undefined &&
                line.unitPrice !== null
                ? Number(line.unitPrice)
                : item.unitPrice;

        const itemTax =
            line.tax !== undefined &&
                line.tax !== null
                ? Number(line.tax)
                : item.tax;

        if (
            unitPrice < 0 ||
            itemTax < 0
        ) {
            throw new Error(
                "Unit price and tax cannot be negative"
            );
        }

        const amount =
            (unitPrice * item.qty) +
            itemTax;

        updatedItems.push(
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
            )
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
        message:
            "Quotation updated successfully",

        data: {
            quotation: updatedQuotation,
            items: updatedItems,
            message
        }
    };
};

export const getQuotationService = async (user, query) => {
    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 6;
    const skip = (page - 1) * limit;
    let filter = {};
    if (user.role !== "admin") {
 filter.customer = new mongoose.Types.ObjectId(user.id);
    }
    const quotation = await Quotation.aggregate([
        {
            $match: filter
        },
        {
            $sort: {
                createdAt: -1
            }
        },
        {
            $skip: skip
        },
        {
            $limit: limit
        },
        {
            $lookup: {
                from: "quotationitems",
                localField: "_id",
                foreignField: "quotation",
                as: "items"
            }
        },
        {
            $lookup: {
                from: "quotationfiles",
                localField: "_id",
                foreignField: "quotation",
                as: "files"
            }
        },
        {
            $lookup: {
                from: "quotationmessages",
                localField: "_id",
                foreignField: "quotation",
                as: "messages"
            }
        }
    ])
    return {
        message: "quotation list",
        data: {
            quotation
        }
    }
}
