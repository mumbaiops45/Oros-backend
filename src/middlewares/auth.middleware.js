import jwt from "jsonwebtoken"
import User from "../models/User.model.js";



export const protect = async (req, res, next) => {
    try {
         
        const token = req.headers.authorization?.startsWith("Bearer ")
            ? req.headers.authorization.split(" ")[1]
            : null;


        if (!token) {
            const error = new Error("Not authorized, no token supplied");
            error.status = 401;
            throw error;
        };

        const decode = jwt.verify(token, process.env.JWT_SECRET);
        if (decode.role === "superAdmin") {
            req.user = {
                _id: "superAdmin",
                name: "Super Admin",
                email: decode.email,
                role: "superAdmin",
            };
            return next();
        }
        const user = await User.findById(decode._id);
        if (!user) {
            const error = new Error("User not found");
            error.status = 401;
            throw error;
        };
        if (user.isBlocked) {
            const error = new Error(
                "Your account is blocked. Kindly contact the owner."
            );
            error.status = 403;
            throw error;
        }
        req.user = user;
        next();
    } catch (error) {
        // an unverifiable token is an auth failure, not a server fault
        if (!error.status) {
            error.status = 401;
        }
        next(error)
    }


}

export const authorize = (...allowedRolles) => {
    return (req, res, next) => {
        try {
            if (!req.user) {
                throw new Error("Not authenticated");
            };
            // the env backed super admin outranks every named role, so it
            // never has to be listed in an authorize(...) call
            if (
                req.user.role !== "superAdmin" &&
                !allowedRolles.includes(req.user.role)
            ) {
                const error = new Error("Access denied");
                error.status = 403;
                throw error;
            };
            next();
        } catch (error) {
            next(error);
        }
    }
}