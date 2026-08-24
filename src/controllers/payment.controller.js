import {
    createUserPaymentOrder,
    verifyUserPayment
} from "../services/payment.service.js";


export const createPaymentOrder =
    async (req, res) => {

        try {

            const {
                orderId
            } = req.params;

            const razorpayOrder =
                await createUserPaymentOrder(
                    orderId
                );

            return res
                .status(200)
                .json({
                    success: true,
                    message:
                        "Razorpay order created successfully",
                    data: razorpayOrder
                });

        } catch (err) {

            console.error(
                "CREATE PAYMENT ORDER ERROR:",
                err
            );

            return res
                .status(400)
                .json({
                    success: false,
                    message: err.message
                });
        }
    };


export const verifyPayment =
    async (req, res) => {

        try {

            const result =
                await verifyUserPayment(
                    req.body
                );

            return res
                .status(200)
                .json({
                    success: true,
                    ...result
                });

        } catch (err) {

            console.error(
                "PAYMENT VERIFICATION ERROR:",
                err
            );

            return res
                .status(400)
                .json({
                    success: false,
                    message: err.message
                });
        }
    };