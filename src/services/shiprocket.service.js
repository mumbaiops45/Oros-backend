import axios from "axios";
import httpError from "../utils/httpError.js";


const getShiprocketToken =
    async () => {

        const response =
            await axios.post(
                "https://apiv2.shiprocket.in/v1/external/auth/login",
                {
                    email:
                        process.env.SHIPROCKET_EMAIL,

                    password:
                        process.env.SHIPROCKET_PASSWORD
                },
                {
                    headers: {
                        "Content-Type":
                            "application/json"
                    }
                }
            );


        const token =
            response?.data?.token;


        if (!token) {

            throw httpError(
                500,
                "Failed to generate Shiprocket token"
            );
        }


        return token;
    };


export const getShiprocketRates =
    async ({
        pickupPincode,
        deliveryPincode,
        packages
    }) => {

        /*
         * Get fresh token from Shiprocket
         */

        const token =
            await getShiprocketToken();


        /*
         * Calculate total package weight
         */

        const totalWeight =
            packages.reduce(
                (total, pkg) =>
                    total +
                    Number(pkg.weight),
                0
            );


        try {

            const response =
                await axios.get(
                    "https://apiv2.shiprocket.in/v1/external/courier/serviceability/",
                    {
                        headers: {
                            Authorization:
                                `Bearer ${token}`
                        },

                        params: {

                            pickup_postcode:
                                pickupPincode,

                            delivery_postcode:
                                deliveryPincode,

                            weight:
                                totalWeight,

                            cod: 0
                        }
                    }
                );


            const couriers =
                response
                    ?.data
                    ?.data
                    ?.available_courier_companies;


            if (
                !couriers ||
                !couriers.length
            ) {

                throw httpError(
                    400,
                    "No shipping rates available"
                );
            }


            return couriers.map(
                courier => ({

                    courierId:
                        courier
                            .courier_company_id,

                    courierName:
                        courier
                            .courier_name,

                    rate:
                        Number(
                            courier.rate
                        ),

                    estimatedDays:
                        courier.etd,

                    freightCharge:
                        Number(
                            courier.freight_charge
                        ),

                    codCharge:
                        Number(
                            courier.cod_charges
                        ),

                    totalCharge:
                        Number(
                            courier.rate
                        )
                })
            );

        } catch (error) {

            if (error.statusCode) {
                throw error;
            }

            throw httpError(
                500,
                error
                    ?.response
                    ?.data
                    ?.message ||
                "Shiprocket rate request failed"
            );
        }
    };