import express from "express"
import { register,verifyRegisterOtp,login,verifyLoginOtp,adminLogin,me } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
const router = express.Router();

router.post("/register",register)
router.post("/register/otp-verify",verifyRegisterOtp)
router.post("/login",login)
router.post("/login/otp-verify",verifyLoginOtp)

// admin panel — email + password, no OTP
router.post("/admin/login",adminLogin)
router.get("/me",protect,me)
export default router;

