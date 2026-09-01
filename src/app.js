import expres from "express"
import errorHandler from "./middlewares/error.middleware.js";
import connectDB from "./config/db.js";
import cors from "cors";


import AuthRoutes from "./routes/auth.route.js";
import CategoryRoutes from "./routes/category.route.js";
import  SubCategoryRoutes from "./routes/subCategory.routes.js";
import productRoutes from "./routes/product.route.js";
import cartRoutes from "./routes/cart.route.js";
import shippingPackageRoutes from "./routes/shippingPackage.route.js";
import addressRoutes from "./routes/address.route.js";
import shippingRoutes from "./routes/shipping.route.js";
import orderRoutes from "./routes/order.route.js";
import userRoutes from "./routes/user.route.js";
import paymentRoutes from "./routes/payment.routes.js";
import quotationRoutes from "./routes/quotation.route.js";
import bannerRoutes from "./routes/banner.route.js";
import analyticsRoutes from "./routes/analytics.route.js";

const app = expres();

connectDB()
app.use(expres.json());

app.use(cors({ origin: true, credentials: true }));

app.use("/api/auth",AuthRoutes)
app.use("/api/category",CategoryRoutes)
app.use("/api/subCategory",SubCategoryRoutes)
app.use("/api/product",productRoutes)
app.use("/api/cart",cartRoutes)
app.use("/api/shipping-package",shippingPackageRoutes);
app.use("/api/address",addressRoutes);
app.use("/api/shipping",shippingRoutes);
app.use("/api/orders",orderRoutes);
app.use("/api/user",userRoutes);
app.use("/api/payment",paymentRoutes);
app.use("/api/quotation",quotationRoutes);
app.use("/api/Banner",bannerRoutes);
app.use("/api/analytics",analyticsRoutes);


app.use(errorHandler)

export default app;