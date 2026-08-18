import { registerService,verifyRegisterOtpService,loginService ,verifyLoginOtpService,adminLoginService} from "../services/auth.service.js";

export const register= async (req,res)=>{
    const {name , email , phone} = req.body;
    const {data,message} = await registerService({name , email , phone} );
    res.json({
        success:true,
        message:message,
        data : data
    })
};

export const verifyRegisterOtp= async (req,res)=>{
    const {name , email , phone,otp} = req.body;
    const {data,message} = await verifyRegisterOtpService({name , email , phone,otp} );
    res.json({
        success:true,
        message:message,
        data : data
    })
}

export const login =async (req,res)=>{
 const {phone} =  req.body;
 const {message,data} = await loginService({phone});
 res.json({
    success:true,
    message:message,
    data
 })
}


export const verifyLoginOtp=async (req,res)=>{
 const {phone,otp} =  req.body;
 const {message,data} = await verifyLoginOtpService({phone,otp});
 res.json({
    success:true,
    message:message,
    data
 })
}

export const adminLogin = async (req, res) => {

    const { email, password } = req.body;

    const { message, data } = await adminLoginService({ email, password });

    res.json({
        success: true,
        message,
        data
    });
};

/**
 * Whoever the bearer token belongs to. The panel calls this on boot to
 * find out whether a stored token is still good.
 */
export const me = async (req, res) => {

    const { _id, name, email, role } = req.user;

    res.json({
        success: true,
        message: "Authenticated",
        data: {
            user: { _id, name, email, role }
        }
    });
};
