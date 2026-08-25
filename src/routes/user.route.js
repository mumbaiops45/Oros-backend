
import express from "express";
import { protect,authorize } from "../middlewares/auth.middleware.js";
import { createUser ,updateUser,getUsers,   deleteUserController} from "../controllers/user.controller.js";

const router = express.Router();

router.get("/",protect,authorize("admin"),getUsers);
router.post("/create",protect,authorize("staff","admin"),createUser)
router.put("/update/:id",protect,authorize("staff","admin"),updateUser)
router.delete("/:id",protect,authorize("admin"),deleteUserController
);

export default router;