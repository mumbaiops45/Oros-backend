import Order from "../models/order.model.js";
import OrderItem from "../models/orderItem.model.js";
import Product from "../models/product.model.js";
import User from "../models/User.model.js";
import Quotation from "../models/quotation.model.js";
import Category from "../models/category.model.js";
import ProductMedia from "../models/productMedia.model.js";
import httpError from "../utils/httpError.js";

/* ------------------------------------------------------------------
   Collection names are read off the models so a model rename never
   silently breaks a $lookup down here.
------------------------------------------------------------------ */
const ORDER_ITEMS = OrderItem.collection.name;
const PRODUCTS = Product.collection.name;
const USERS = User.collection.name;
const CATEGORIES = Category.collection.name;
const PRODUCT_MEDIA = ProductMedia.collection.name;

// orders that actually represent money earned - a cart that was never
// paid for and a cancelled order must not inflate any revenue number
export const SALES_ORDER_STATUSES = [
    "PAID",
    "CONFIRMED",
    "PROCESSING",
    "IN_PRODUCTION",
    "COMPLETED"
];

const ORDER_SOURCES = ["STORE", "QUOTATION", "MANUAL"];

const TIMEZONE =
    process.env.ANALYTICS_TIMEZONE || "Asia/Kolkata";

const DAY_MS = 24 * 60 * 60 * 1000;

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;


/* ------------------------------------------------------------------
   helpers
------------------------------------------------------------------ */

const round2 = (value) =>
    Math.round((Number(value) || 0) * 100) / 100;


const parseLimit = (value, fallback = 10, max = 50) => {
    const limit = parseInt(value, 10);

    if (Number.isNaN(limit) || limit < 1) {
        return fallback;
    }

    return Math.min(limit, max);
};


// percentage change of the current window against the one before it
const growth = (current, previous) => {
    if (!previous) {
        return current ? 100 : 0;
    }

    return round2(((current - previous) / previous) * 100);
};


/**
 * Resolves ?from & ?to into a window, plus the equally long window
 * immediately before it so every KPI can report a trend.
 * Defaults to the last 30 days.
 */
export const buildRange = ({ from, to } = {}) => {

    const end = to ? new Date(to) : new Date();

    if (Number.isNaN(end.getTime())) {
        throw httpError(400, "Invalid 'to' date");
    }

    // a plain YYYY-MM-DD means the caller wants that whole day included
    if (typeof to === "string" && DATE_ONLY.test(to)) {
        end.setUTCHours(23, 59, 59, 999);
    }

    const start = from
        ? new Date(from)
        : new Date(end.getTime() - 29 * DAY_MS);

    if (Number.isNaN(start.getTime())) {
        throw httpError(400, "Invalid 'from' date");
    }

    if (start > end) {
        throw httpError(
            400,
            "'from' date cannot be after 'to' date"
        );
    }

    const span = end.getTime() - start.getTime();

    return {
        start,
        end,
        previousStart: new Date(start.getTime() - span - 1),
        previousEnd: new Date(start.getTime() - 1)
    };
};


/**
 * Match stage for the Order collection.
 * `statuses = null` keeps every status (used by the status breakdown).
 */
const buildOrderMatch = (
    query = {},
    { start, end, statuses = SALES_ORDER_STATUSES } = {}
) => {

    const match = {
        createdAt: {
            $gte: start,
            $lte: end
        }
    };

    if (statuses) {
        match.status = { $in: statuses };
    }

    if (query.source) {
        const source = String(query.source).toUpperCase();

        if (!ORDER_SOURCES.includes(source)) {
            throw httpError(
                400,
                `Invalid source. Allowed: ${ORDER_SOURCES.join(", ")}`
            );
        }

        match.source = source;
    }

    return match;
};


// order -> its line items, ready to be $unwind-ed as `item`
const ORDER_ITEMS_LOOKUP = {
    $lookup: {
        from: ORDER_ITEMS,
        localField: "_id",
        foreignField: "order",
        as: "item"
    }
};


/* ------------------------------------------------------------------
   1. OVERVIEW  -  the KPI cards on top of the dashboard
------------------------------------------------------------------ */

const revenuePipeline = (match) => ([
    { $match: match },
    {
        $group: {
            _id: null,
            orders: { $sum: 1 },
            revenue: { $sum: "$pricing.total" },
            subtotal: { $sum: "$pricing.subtotal" },
            tax: { $sum: "$pricing.tax" },
            shipping: { $sum: "$pricing.shipping" },
            customers: { $addToSet: "$user" }
        }
    },
    {
        $project: {
            _id: 0,
            orders: 1,
            revenue: 1,
            subtotal: 1,
            tax: 1,
            shipping: 1,
            customers: { $size: "$customers" }
        }
    }
]);


const EMPTY_REVENUE = {
    orders: 0,
    revenue: 0,
    subtotal: 0,
    tax: 0,
    shipping: 0,
    customers: 0
};


export const getOverviewService = async (query = {}) => {

    const range = buildRange(query);

    const currentMatch = buildOrderMatch(query, range);

    const previousMatch = buildOrderMatch(query, {
        start: range.previousStart,
        end: range.previousEnd
    });

    const [
        currentRows,
        previousRows,
        unitRows,
        newCustomers,
        totalCustomers,
        publishedProducts,
        openQuotations,
        cancelledOrders,
        unpaidOrders
    ] = await Promise.all([

        Order.aggregate(revenuePipeline(currentMatch)),

        Order.aggregate(revenuePipeline(previousMatch)),

        Order.aggregate([
            { $match: currentMatch },
            ORDER_ITEMS_LOOKUP,
            { $unwind: "$item" },
            {
                $group: {
                    _id: null,
                    unitsSold: { $sum: "$item.qty" },
                    lineItems: { $sum: 1 }
                }
            }
        ]),

        User.countDocuments({
            role: "user",
            createdAt: {
                $gte: range.start,
                $lte: range.end
            }
        }),

        User.countDocuments({ role: "user" }),

        Product.countDocuments({ status: "PUBLISHED" }),

        Quotation.countDocuments({
            status: {
                $in: ["PENDING", "IN_REVIEW", "QUOTED"]
            }
        }),

        Order.countDocuments({
            status: "CANCELLED",
            createdAt: {
                $gte: range.start,
                $lte: range.end
            }
        }),

        Order.countDocuments({
            status: "PENDING_PAYMENT",
            createdAt: {
                $gte: range.start,
                $lte: range.end
            }
        })
    ]);

    const current = currentRows[0] || EMPTY_REVENUE;
    const previous = previousRows[0] || EMPTY_REVENUE;
    const units = unitRows[0] || { unitsSold: 0, lineItems: 0 };

    const averageOrderValue = current.orders
        ? current.revenue / current.orders
        : 0;

    const previousAov = previous.orders
        ? previous.revenue / previous.orders
        : 0;

    return {
        message: "Overview analytics fetched successfully",
        data: {
            range: {
                from: range.start,
                to: range.end,
                comparedFrom: range.previousStart,
                comparedTo: range.previousEnd
            },

            revenue: {
                total: round2(current.revenue),
                subtotal: round2(current.subtotal),
                tax: round2(current.tax),
                shipping: round2(current.shipping),
                previous: round2(previous.revenue),
                growthPercent: growth(
                    current.revenue,
                    previous.revenue
                )
            },

            orders: {
                total: current.orders,
                previous: previous.orders,
                growthPercent: growth(
                    current.orders,
                    previous.orders
                ),
                cancelled: cancelledOrders,
                pendingPayment: unpaidOrders
            },

            averageOrderValue: {
                value: round2(averageOrderValue),
                previous: round2(previousAov),
                growthPercent: growth(
                    averageOrderValue,
                    previousAov
                )
            },

            items: {
                unitsSold: units.unitsSold,
                lineItems: units.lineItems,
                averageUnitsPerOrder: current.orders
                    ? round2(units.unitsSold / current.orders)
                    : 0
            },

            customers: {
                buyingInRange: current.customers,
                newInRange: newCustomers,
                total: totalCustomers
            },

            catalogue: {
                publishedProducts,
                openQuotations
            }
        }
    };
};


/* ------------------------------------------------------------------
   2. SALES TREND  -  revenue / orders bucketed over time
------------------------------------------------------------------ */

const TREND_FORMATS = {
    day: "%Y-%m-%d",
    week: "%G-W%V",
    month: "%Y-%m",
    year: "%Y"
};


// a chart with holes in it lies about the shape of the business, so
// every missing day/month inside the range is emitted as a zero bucket
const fillGaps = (rows, groupBy, start, end) => {

    if (groupBy !== "day" && groupBy !== "month") {
        return rows;
    }

    const found = new Map(
        rows.map(row => [row.period, row])
    );

    const filled = [];

    const cursor = new Date(start.getTime());

    while (cursor <= end) {

        const period = groupBy === "day"
            ? cursor.toISOString().slice(0, 10)
            : cursor.toISOString().slice(0, 7);

        const last = filled[filled.length - 1];

        if (!last || last.period !== period) {
            filled.push(
                found.get(period) || {
                    period,
                    orders: 0,
                    revenue: 0,
                    unitsSold: 0,
                    averageOrderValue: 0
                }
            );
        }

        if (groupBy === "day") {
            cursor.setUTCDate(cursor.getUTCDate() + 1);
        } else {
            cursor.setUTCMonth(cursor.getUTCMonth() + 1);
        }
    }

    return filled;
};


export const getSalesTrendService = async (query = {}) => {

    const groupBy = String(
        query.groupBy || "day"
    ).toLowerCase();

    if (!TREND_FORMATS[groupBy]) {
        throw httpError(
            400,
            `Invalid groupBy. Allowed: ${Object.keys(TREND_FORMATS).join(", ")}`
        );
    }

    const range = buildRange(query);

    const match = buildOrderMatch(query, range);

    const rows = await Order.aggregate([
        { $match: match },
        ORDER_ITEMS_LOOKUP,
        {
            $group: {
                _id: {
                    $dateToString: {
                        format: TREND_FORMATS[groupBy],
                        date: "$createdAt",
                        timezone: TIMEZONE
                    }
                },
                orders: { $sum: 1 },
                revenue: { $sum: "$pricing.total" },
                unitsSold: { $sum: { $sum: "$item.qty" } }
            }
        },
        { $sort: { _id: 1 } },
        {
            $project: {
                _id: 0,
                period: "$_id",
                orders: 1,
                revenue: { $round: ["$revenue", 2] },
                unitsSold: 1,
                averageOrderValue: {
                    $round: [
                        { $divide: ["$revenue", "$orders"] },
                        2
                    ]
                }
            }
        }
    ]);

    const buckets = fillGaps(
        rows,
        groupBy,
        range.start,
        range.end
    );

    const totals = buckets.reduce(
        (acc, row) => {
            acc.orders += row.orders;
            acc.revenue += row.revenue;
            acc.unitsSold += row.unitsSold;
            return acc;
        },
        { orders: 0, revenue: 0, unitsSold: 0 }
    );

    const bestPeriod = buckets.reduce(
        (top, row) =>
            !top || row.revenue > top.revenue ? row : top,
        null
    );

    return {
        message: "Sales trend fetched successfully",
        data: {
            range: {
                from: range.start,
                to: range.end
            },
            groupBy,
            timezone: TIMEZONE,
            totals: {
                orders: totals.orders,
                revenue: round2(totals.revenue),
                unitsSold: totals.unitsSold
            },
            bestPeriod,
            buckets
        }
    };
};


/* ------------------------------------------------------------------
   3. TOP / MAXIMUM SELLING PRODUCTS
------------------------------------------------------------------ */

export const getTopProductsService = async (query = {}) => {

    const range = buildRange(query);

    const match = buildOrderMatch(query, range);

    const limit = parseLimit(query.limit);

    const sortBy = String(
        query.sortBy || "revenue"
    ).toLowerCase();

    if (!["revenue", "qty"].includes(sortBy)) {
        throw httpError(
            400,
            "Invalid sortBy. Allowed: revenue, qty"
        );
    }

    const sortStage = sortBy === "qty"
        ? { unitsSold: -1, revenue: -1 }
        : { revenue: -1, unitsSold: -1 };

    const rows = await Order.aggregate([
        { $match: match },
        ORDER_ITEMS_LOOKUP,
        { $unwind: "$item" },
        {
            $group: {
                _id: "$item.product",
                // snapshots survive a product rename or delete, so they
                // are the safest label to fall back on
                nameSnapshot: { $last: "$item.nameSnapshot" },
                skuSnapshot: { $last: "$item.skuSnapshot" },
                unitsSold: { $sum: "$item.qty" },
                revenue: { $sum: "$item.lineTotal" },
                tax: { $sum: "$item.taxAmount" },
                orders: { $addToSet: "$_id" },
                customers: { $addToSet: "$user" },
                lastSoldAt: { $max: "$createdAt" }
            }
        },
        { $sort: sortStage },
        { $limit: limit },
        {
            $lookup: {
                from: PRODUCTS,
                localField: "_id",
                foreignField: "_id",
                as: "product"
            }
        },
        {
            $unwind: {
                path: "$product",
                preserveNullAndEmptyArrays: true
            }
        },
        {
            $lookup: {
                from: PRODUCT_MEDIA,
                let: { productId: "$_id" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $eq: ["$product", "$$productId"]
                            }
                        }
                    },
                    { $sort: { isPrimary: -1, sortOrder: 1 } },
                    { $limit: 1 },
                    { $project: { _id: 0, url: 1 } }
                ],
                as: "media"
            }
        },
        {
            $lookup: {
                from: CATEGORIES,
                localField: "product.category",
                foreignField: "_id",
                as: "category"
            }
        },
        {
            $project: {
                _id: 0,
                productId: "$_id",
                name: {
                    $ifNull: ["$product.name", "$nameSnapshot"]
                },
                sku: {
                    $ifNull: ["$product.sku", "$skuSnapshot"]
                },
                slug: "$product.slug",
                status: "$product.status",
                basePrice: "$product.basePrice",
                category: {
                    $ifNull: [{ $first: "$category.name" }, null]
                },
                image: {
                    $ifNull: [{ $first: "$media.url" }, null]
                },
                unitsSold: 1,
                revenue: { $round: ["$revenue", 2] },
                tax: { $round: ["$tax", 2] },
                orderCount: { $size: "$orders" },
                customerCount: { $size: "$customers" },
                averageUnitPrice: {
                    $round: [
                        { $divide: ["$revenue", "$unitsSold"] },
                        2
                    ]
                },
                lastSoldAt: 1
            }
        }
    ]);

    return {
        message: "Top selling products fetched successfully",
        data: {
            range: {
                from: range.start,
                to: range.end
            },
            sortBy,
            limit,
            bestSeller: rows[0] || null,
            products: rows
        }
    };
};


/* ------------------------------------------------------------------
   4. TOP CATEGORIES
------------------------------------------------------------------ */

export const getTopCategoriesService = async (query = {}) => {

    const range = buildRange(query);

    const match = buildOrderMatch(query, range);

    const limit = parseLimit(query.limit);

    const rows = await Order.aggregate([
        { $match: match },
        ORDER_ITEMS_LOOKUP,
        { $unwind: "$item" },
        {
            $lookup: {
                from: PRODUCTS,
                localField: "item.product",
                foreignField: "_id",
                as: "product"
            }
        },
        { $unwind: "$product" },
        {
            $group: {
                _id: "$product.category",
                unitsSold: { $sum: "$item.qty" },
                revenue: { $sum: "$item.lineTotal" },
                orders: { $addToSet: "$_id" },
                products: { $addToSet: "$product._id" }
            }
        },
        { $sort: { revenue: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: CATEGORIES,
                localField: "_id",
                foreignField: "_id",
                as: "category"
            }
        },
        {
            $project: {
                _id: 0,
                categoryId: "$_id",
                name: {
                    $ifNull: [
                        { $first: "$category.name" },
                        "Unknown"
                    ]
                },
                slug: { $first: "$category.slug" },
                image: { $first: "$category.image" },
                unitsSold: 1,
                revenue: { $round: ["$revenue", 2] },
                orderCount: { $size: "$orders" },
                productCount: { $size: "$products" }
            }
        }
    ]);

    const totalRevenue = rows.reduce(
        (sum, row) => sum + row.revenue,
        0
    );

    return {
        message: "Top categories fetched successfully",
        data: {
            range: {
                from: range.start,
                to: range.end
            },
            totalRevenue: round2(totalRevenue),
            categories: rows.map(row => ({
                ...row,
                revenueSharePercent: totalRevenue
                    ? round2((row.revenue / totalRevenue) * 100)
                    : 0
            }))
        }
    };
};


/* ------------------------------------------------------------------
   5. TOP CUSTOMERS
------------------------------------------------------------------ */

export const getTopCustomersService = async (query = {}) => {

    const range = buildRange(query);

    const match = buildOrderMatch(query, range);

    const limit = parseLimit(query.limit);

    const rows = await Order.aggregate([
        { $match: match },
        {
            $group: {
                _id: "$user",
                orders: { $sum: 1 },
                revenue: { $sum: "$pricing.total" },
                firstOrderAt: { $min: "$createdAt" },
                lastOrderAt: { $max: "$createdAt" }
            }
        },
        { $sort: { revenue: -1, orders: -1 } },
        { $limit: limit },
        {
            $lookup: {
                from: USERS,
                localField: "_id",
                foreignField: "_id",
                as: "user"
            }
        },
        {
            $project: {
                _id: 0,
                userId: "$_id",
                name: { $first: "$user.name" },
                phone: { $first: "$user.phone" },
                email: { $first: "$user.email" },
                accountType: { $first: "$user.accountType" },
                orders: 1,
                revenue: { $round: ["$revenue", 2] },
                averageOrderValue: {
                    $round: [
                        { $divide: ["$revenue", "$orders"] },
                        2
                    ]
                },
                firstOrderAt: 1,
                lastOrderAt: 1
            }
        }
    ]);

    return {
        message: "Top customers fetched successfully",
        data: {
            range: {
                from: range.start,
                to: range.end
            },
            customers: rows
        }
    };
};


/* ------------------------------------------------------------------
   6. ORDER BREAKDOWN  -  status / payment / source split
------------------------------------------------------------------ */

export const getOrderBreakdownService = async (query = {}) => {

    const range = buildRange(query);

    // every status matters here, cancelled and unpaid included
    const match = buildOrderMatch(query, {
        start: range.start,
        end: range.end,
        statuses: null
    });

    const splitBy = (field) => ([
        {
            $group: {
                _id: field,
                orders: { $sum: 1 },
                revenue: { $sum: "$pricing.total" }
            }
        },
        { $sort: { orders: -1 } },
        {
            $project: {
                _id: 0,
                key: { $ifNull: ["$_id", "UNSET"] },
                orders: 1,
                revenue: { $round: ["$revenue", 2] }
            }
        }
    ]);

    const [result] = await Order.aggregate([
        { $match: match },
        {
            $facet: {
                byStatus: splitBy("$status"),
                byPaymentStatus: splitBy("$payment.status"),
                byPaymentMethod: splitBy("$payment.method"),
                bySource: splitBy("$source"),
                total: [
                    {
                        $group: {
                            _id: null,
                            orders: { $sum: 1 },
                            revenue: { $sum: "$pricing.total" }
                        }
                    }
                ]
            }
        }
    ]);

    const total = result?.total?.[0] || {
        orders: 0,
        revenue: 0
    };

    const withShare = (rows = []) =>
        rows.map(row => ({
            ...row,
            sharePercent: total.orders
                ? round2((row.orders / total.orders) * 100)
                : 0
        }));

    return {
        message: "Order breakdown fetched successfully",
        data: {
            range: {
                from: range.start,
                to: range.end
            },
            total: {
                orders: total.orders,
                revenue: round2(total.revenue)
            },
            byStatus: withShare(result?.byStatus),
            byPaymentStatus: withShare(result?.byPaymentStatus),
            byPaymentMethod: withShare(result?.byPaymentMethod),
            bySource: withShare(result?.bySource)
        }
    };
};


/* ------------------------------------------------------------------
   7. QUOTATION ANALYTICS
------------------------------------------------------------------ */

export const getQuotationAnalyticsService = async (query = {}) => {

    const range = buildRange(query);

    const [result] = await Quotation.aggregate([
        {
            $match: {
                createdAt: {
                    $gte: range.start,
                    $lte: range.end
                }
            }
        },
        {
            $facet: {
                byStatus: [
                    {
                        $group: {
                            _id: "$status",
                            count: { $sum: 1 },
                            value: { $sum: "$total" }
                        }
                    },
                    { $sort: { count: -1 } },
                    {
                        $project: {
                            _id: 0,
                            status: "$_id",
                            count: 1,
                            value: { $round: ["$value", 2] }
                        }
                    }
                ],
                byType: [
                    {
                        $group: {
                            _id: "$type",
                            count: { $sum: 1 },
                            value: { $sum: "$total" }
                        }
                    },
                    {
                        $project: {
                            _id: 0,
                            type: { $ifNull: ["$_id", "UNSET"] },
                            count: 1,
                            value: { $round: ["$value", 2] }
                        }
                    }
                ],
                total: [
                    {
                        $group: {
                            _id: null,
                            count: { $sum: 1 },
                            value: { $sum: "$total" },
                            converted: {
                                $sum: {
                                    $cond: [
                                        {
                                            $ne: [
                                                "$convertedOrderId",
                                                null
                                            ]
                                        },
                                        1,
                                        0
                                    ]
                                }
                            }
                        }
                    }
                ]
            }
        }
    ]);

    const total = result?.total?.[0] || {
        count: 0,
        value: 0,
        converted: 0
    };

    return {
        message: "Quotation analytics fetched successfully",
        data: {
            range: {
                from: range.start,
                to: range.end
            },
            total: {
                quotations: total.count,
                quotedValue: round2(total.value),
                converted: total.converted,
                averageValue: total.count
                    ? round2(total.value / total.count)
                    : 0,
                conversionRatePercent: total.count
                    ? round2((total.converted / total.count) * 100)
                    : 0
            },
            byStatus: result?.byStatus || [],
            byType: result?.byType || []
        }
    };
};


/* ------------------------------------------------------------------
   8. NON MOVING PRODUCTS  -  published but never sold in the range
------------------------------------------------------------------ */

export const getNonMovingProductsService = async (query = {}) => {

    const range = buildRange(query);

    const match = buildOrderMatch(query, range);

    const limit = parseLimit(query.limit, 20);

    const soldRows = await Order.aggregate([
        { $match: match },
        ORDER_ITEMS_LOOKUP,
        { $unwind: "$item" },
        { $group: { _id: "$item.product" } }
    ]);

    const soldIds = soldRows.map(row => row._id);

    const filter = {
        status: "PUBLISHED",
        _id: { $nin: soldIds }
    };

    const [products, notSoldProductCount] = await Promise.all([

        Product.find(filter)
            .select("name sku slug basePrice category createdAt")
            .populate("category", "name")
            .sort({ createdAt: -1 })
            .limit(limit)
            .lean(),

        Product.countDocuments(filter)
    ]);

    return {
        message: "Non moving products fetched successfully",
        data: {
            range: {
                from: range.start,
                to: range.end
            },
            soldProductCount: soldIds.length,
            notSoldProductCount,
            products
        }
    };
};


/* ------------------------------------------------------------------
   9. DASHBOARD  -  everything the admin home screen needs, one call
------------------------------------------------------------------ */

export const getDashboardService = async (query = {}) => {

    const topQuery = {
        ...query,
        limit: query.limit || 5
    };

    const [
        overview,
        salesTrend,
        topProducts,
        topCategories,
        topCustomers,
        orderBreakdown,
        quotations
    ] = await Promise.all([
        getOverviewService(query),
        getSalesTrendService(query),
        getTopProductsService(topQuery),
        getTopCategoriesService(topQuery),
        getTopCustomersService(topQuery),
        getOrderBreakdownService(query),
        getQuotationAnalyticsService(query)
    ]);

    return {
        message: "Dashboard analytics fetched successfully",
        data: {
            overview: overview.data,
            salesTrend: salesTrend.data,
            topProducts: topProducts.data,
            topCategories: topCategories.data,
            topCustomers: topCustomers.data,
            orderBreakdown: orderBreakdown.data,
            quotations: quotations.data
        }
    };
};
