import ProductOption
    from "../models/productOption.model.js";

import ProductOptionValue
    from "../models/productOptionValue.model.js";


export const calculateCartPricing =
    async (cartItems) => {

        let subtotal = 0;

        let tax = 0;

        const items = [];


        for (
            const cartItem
            of cartItems
        ) {

            /*
             * Product is already populated
             * by order.service.js
             */

            const product =
                cartItem.product;


            if (!product) {

                throw new Error(
                    "Product not found"
                );
            }


            /*
             * Product must be published
             */

            if (
                product.status !==
                "PUBLISHED"
            ) {

                throw new Error(
                    `${product.name} is unavailable`
                );
            }


            /*
             * Start with base price
             */

            let unitPrice =
                product.basePrice;


            /*
             * Apply selected options
             */

            for (
                const selectedOption
                of cartItem.selectedOptions || []
            ) {

                const option =
                    await ProductOption.findOne({

                        product:
                            product._id,

                        name:
                            selectedOption.name

                    }).lean();


                if (!option) {

                    throw new Error(
                        `Invalid option: ${selectedOption.name}`
                    );
                }


                const optionValue =
                    await ProductOptionValue.findOne({

                        option:
                            option._id,

                        value:
                            selectedOption.value

                    }).lean();


                if (!optionValue) {

                    throw new Error(
                        `Invalid value: ${selectedOption.value}`
                    );
                }


                /*
                 * Add fixed price
                 */

                unitPrice +=
                    optionValue.priceDelta || 0;


                /*
                 * Apply multiplier
                 */

                unitPrice *=
                    optionValue.priceMultiplier || 1;
            }


            /*
             * Calculate line total
             */

            const lineTotal =
                unitPrice *
                cartItem.qty;


            /*
             * Calculate tax
             */

            const taxAmount =
                lineTotal *
                (
                    (cartItem.taxRate || 0)
                    / 100
                );


            subtotal +=
                lineTotal;


            tax +=
                taxAmount;


            /*
             * Order item snapshot
             */

            items.push({

                product:
                    product._id,

                nameSnapshot:
                    product.name,

                skuSnapshot:
                    product.sku,

                qty:
                    cartItem.qty,

                unitPrice,

                selectedOptions:
                    cartItem.selectedOptions || [],

                personalisation:
                    cartItem.personalisation || {},

                taxRate:
                    cartItem.taxRate || 0,

                taxAmount,

                lineTotal

            });
        }


        return {

            items,

            subtotal,

            tax

        };
    };