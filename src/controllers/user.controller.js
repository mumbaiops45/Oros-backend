import { createUserService, updateUserBYidService ,getUsersService,  deleteUserService} from "../services/user.service.js";

export const createUser =async(req,res)=>{
    const {message,data}= await createUserService(req.body,req.user);

    res.json({
        message,
        success:true,
        data
    })

}

export const updateUser=async(req,res)=>{
const {message,data} = await updateUserBYidService(req.params.id,req.body,req.user);

res.json({
    message,
    success:true,
    data
})
}


export const getUsers = async (req, res) => {

    const { message, data } =
        await getUsersService(req.query);

    return res.status(200).json({
        message,
        success: true,
        data
    });
};

export const deleteUserController = async (req, res) => {

    const { id } = req.params;

    const result =
        await deleteUserService(id);

    return res.status(200).json({
        success: true,
        message: result.message,
        data: result.data
    });
};