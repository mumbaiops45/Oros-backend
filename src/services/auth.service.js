import User from "../models/User.model.js";
import bcrypt from "bcryptjs";
import Otp from "../models/otp.model.js";
import { generateJwtToken } from "../utils/jwt.js";
import { httpError } from "../utils/httpError.js";
const fixedOtp = "123456";



export const registerService = async ({ name, email, phone }) => {

    if (!phone || !name || !email) {
        throw new Error(
            "Phone, name and email are required"
        );
    }

    const existing = await User.findOne({ phone });
    if (existing) {
        throw new Error("Mobile number is already exist please login");
    }
    const otpHash = await bcrypt.hash(fixedOtp, 10);
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);

    await Otp.findOneAndUpdate(
        { phone },
        {
            otpHash,
            expireAt,
            attempts: 0,
            consumeAt: null,
            lockedUntill: null
        },
        {
            upsert: true,
            new: true
        }
    );



    return {
        message: "Registration OTP sent successfully",
        data: {
        }
    }

};

export const verifyRegisterOtpService = async ({ name, email, phone, otp }) => {

    if (!phone || !otp || !name || !email) {
        throw new Error(
            "Phone, OTP, name and email are required"
        );
    }
    // const exist = await Otp.findOne({
    //     phone
    // });
    // if (!exist) {
    //     throw new Error("Mobile Number not eist");

    // }

    const otpRecord = await Otp.findOne({
        phone,
        consumeAt: null
    })

    if (!otpRecord) {
        throw new Error("otp not found");

    };
    if (otpRecord.expireAt < new Date()) {
        throw new Error("otp is expire");

    }
    if (otpRecord.lockedUntill && otpRecord.lockedUntill > new Date()) {
        throw new Error("otp verification is temporarily locked, try after 30 minut");
    };
    if (otpRecord.attempts >= 5) {
        otpRecord.lockedUntill = new Date(Date.now() + 30 * 60 * 1000);
        await otpRecord.save();
        throw new Error("maximum otp request reached");

    };
    const match = await bcrypt.compare(otp, otpRecord.otpHash);
    if (!match) {
        otpRecord.attempts += 1;
        if (otpRecord.attempts >= 5) {
            otpRecord.lockedUntill = new Date(Date.now() + 30 * 60 * 1000);


        }

        await otpRecord.save();
        throw new Error("otp does not match,please try again");

    };
    const existingUser = await User.findOne({ phone });
    if (existingUser) {
        throw new Error("User already exist please login ");

    };
    otpRecord.consumeAt = new Date();

    await otpRecord.save();

    const user = await User.create({
        phone,
        name,
        email,
        role: "user"
    });

    return {
        message: "Registration successfully",
        data: {
            user,
        }
    }

}

export const loginService = async ({ phone }) => {
    if (!phone) {
        throw new Error("mobile number is required for login");

    };
    const user = await User.findOne({
        phone
    })
    if (!user) {
        throw new Error("User not found,first resiter");
    };

    if (user.isBlocked) {
        throw new Error("Your account is blocked");

    };

    const otpRecord = await Otp.findOne({ phone });
    if (otpRecord.lockedUntill && otpRecord.lockedUntill > new Date()) {
        throw new Error("otp verification is temporarily locked, try after 30 minut");
    }

    const otpHash = await bcrypt.hash(fixedOtp, 10);
    const expireAt = new Date(Date.now() + 10 * 60 * 1000);
    await Otp.findOneAndUpdate({ phone },
        {
            otpHash,
            expireAt,
            consumeAt: null,
            attempts: 0
        },
        {
            new: true,
            upsert: true
        }
    )

    return {
        message: "Login Otp send successfully",
        data: {}
    }
}


export const verifyLoginOtpService = async ({
    phone,
    otp
}) => {

    if (!phone || !otp) {
        throw new Error("Phone and OTP are required");
    }

    const otpRecord = await Otp.findOne({
        phone,
        consumeAt: null
    })

    if (!otpRecord) {
        throw new Error("OTP not found");
    }

    if (otpRecord.expireAt < new Date()) {
        throw new Error("OTP is expired");
    }

    if (
        otpRecord.lockedUntill &&
        otpRecord.lockedUntill > new Date()
    ) {
        throw new Error(
            "OTP verification is temporarily locked, try after 30 minutes"
        );
    }

    // if (otpRecord.attempts >= 5) {

    //     otpRecord.lockedUntill = new Date(
    //         Date.now() + 30 * 60 * 1000
    //     );

    //     await otpRecord.save();

    //     throw new Error(
    //         "Maximum OTP attempts reached"
    //     );
    // }

    const match = await bcrypt.compare(
        otp,
        otpRecord.otpHash
    );

    if (!match) {

        otpRecord.attempts += 1;

        if (otpRecord.attempts >= 5) {
            otpRecord.lockedUntill = new Date(
                Date.now() + 30 * 60 * 1000
            );
        }

        await otpRecord.save();

        throw new Error(
            "OTP does not match, please try again"
        );
    }

    const user = await User.findOne({ phone });

    if (!user) {
        throw new Error(
            "User not found, please register first"
        );
    }

    if (user.isBlocked) {
        throw new Error("Your account is blocked");
    }


    const token = generateJwtToken({ _id: user._id, role: user.role });

    otpRecord.consumeAt = new Date();

    await otpRecord.save();

    user.lastLoginAt = new Date();

    await user.save();

    return {
        message: "Login successful",
        data: {
            user,
            token
        }
    };
};


/* ------------------------------------------------------------------
   ADMIN PANEL LOGIN

   Staff never receive an OTP. The only credential pair that exists
   today is SUPER_ADMIN_EMAIL / SUPER_ADMIN_PASSWORD in .env, so that
   is what this checks. The issued token carries role "superAdmin",
   which `protect` resolves without a database lookup and which
   `authorize` lets through every admin gated route.
------------------------------------------------------------------ */

export const adminLoginService = async ({ email, password }) => {

    if (!email || !password) {
        throw httpError(400, "Email and password are required");
    }

    const superEmail = process.env.SUPER_ADMIN_EMAIL;
    const superPassword = process.env.SUPER_ADMIN_PASSWORD;

    if (!superEmail || !superPassword) {
        throw httpError(
            500,
            "SUPER_ADMIN_EMAIL and SUPER_ADMIN_PASSWORD are not configured"
        );
    }

    const emailMatches =
        String(email).trim().toLowerCase() ===
        String(superEmail).trim().toLowerCase();

    if (!emailMatches || String(password) !== String(superPassword)) {
        throw httpError(401, "Invalid email or password");
    }

    const user = {
        _id: "superAdmin",
        name: "Super Admin",
        email: superEmail,
        role: "superAdmin"
    };

    const token = generateJwtToken({
        _id: "superAdmin",
        role: "superAdmin",
        email: superEmail
    });

    return {
        message: "Login successful",
        data: {
            user,
            token
        }
    };
};
