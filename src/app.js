import expres from "express"
import errorHandler from "./middlewares/error.middleware.js";
import connectDB from "./config/db.js";
import cors from "cors";


import AuthRoutes from "./routes/auth.route.js";
import CategoryRoutes from "./routes/category.route.js";
import  SubCategoryRoutes from "./routes/subCategory.routes.js";
import productRoutes from "./routes/product.route.js";

const app = expres();

connectDB()
app.use(expres.json());
// the admin panel sends withCredentials, and a wildcard origin is rejected
// by the browser on a credentialed request — reflect the caller instead
app.use(cors({ origin: true, credentials: true }));

app.use("/api/auth",AuthRoutes)
app.use("/api/category",CategoryRoutes)
app.use("/api/subCategory",SubCategoryRoutes)
app.use("/api/product",productRoutes)

app.use(errorHandler)

export default app;