import jwt from "jsonwebtoken";
export const generateJwtToken = (payload) => {
    return jwt.sign(
       payload,
        process.env.JWT_SECRET,
        {
            expiresIn: "7d"
        }
    );

}

export const verifyToken =(token) =>{
    return jwt.verify(
        token,
        process.env.JWT_SECRET
    )
}