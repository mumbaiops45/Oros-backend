import Order from "../models/order.model.js";
import crypto from "crypto";
import razorpay from "../config/razorpay.js";


export const createUserPaymentOrder = async (orderId) => {

    const order = await Order.findById(orderId);

    if (!order) {
        throw new Error("Order not found");
    }

    if (order.payment.status === "PAID") {
        throw new Error("Order already paid");
    }

    if (order.status !== "PENDING_PAYMENT") {
        throw new Error("Order is not available for payment");
    }

    const options = {
        amount: Math.round(order.pricing.total * 100),
        currency: "INR",
        receipt: order._id.toString()
    };

    const razorpayOrder =
        await razorpay.orders.create(options);

    order.payment.method = "ONLINE";
    order.payment.provider = "RAZORPAY";
    order.payment.status = "PENDING";
    order.payment.paymentOrderId = razorpayOrder.id;

    await order.save();

    return razorpayOrder;
};


export const verifyUserPayment = async ({
    razorpay_order_id,
    razorpay_payment_id,
    razorpay_signature
}) => {

    if (
        !razorpay_order_id ||
        !razorpay_payment_id ||
        !razorpay_signature
    ) {
        throw new Error("Missing payment details");
    }

    const body =
        razorpay_order_id +
        "|" +
        razorpay_payment_id;

    const expectedSignature =
        crypto
            .createHmac(
                "sha256",
                process.env.RAZORPAY_KEY_SECRET
            )
            .update(body)
            .digest("hex");

    if (
        expectedSignature !==
        razorpay_signature
    ) {
        throw new Error(
            "Payment verification failed"
        );
    }

    const order =
        await Order.findOne({
            "payment.paymentOrderId":
                razorpay_order_id
        });

    if (!order) {
        throw new Error(
            "Order not found"
        );
    }

    if (
        order.payment.status === "PAID"
    ) {
        return {
            message:
                "Payment already verified",
            order
        };
    }

    order.payment.status = "PAID";

    order.payment.transactionId =
        razorpay_payment_id;

    order.payment.paidAt =
        new Date();

    order.status = "PAID";

    await order.save();

    return {
        message:
            "Payment verified successfully",
        order
    };
};