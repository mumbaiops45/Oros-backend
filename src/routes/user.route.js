
import express from "express";
import { protect,authorize } from "../middlewares/auth.middleware.js";
import { createUser ,updateUser,getUsers,   deleteUserController,   getProfile,
    updateProfile} from "../controllers/user.controller.js";
import { profileUpload } from "../middlewares/upload.middleware.js";

const router = express.Router();
// manual user made by admin and staff for store
router.get("/",protect,authorize("admin"),getUsers);
router.post("/create",protect,authorize("staff","admin"),createUser)
router.put("/update/:id",protect,authorize("staff","admin"),updateUser)
router.delete("/:id",protect,authorize("admin"),deleteUserController);


// profile edite by costomer

router.get("/profile",protect,authorize('user',"admin"),getProfile);
router.patch("/profile",protect,authorize("user","admin"),profileUpload.single("profileImage"),updateProfile);

export default router;