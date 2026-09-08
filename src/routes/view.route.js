import { productViewcreate } from "../controllers/view.controller.js";
import express from "express";
 const router = express.Router();


 router.post("/",productViewcreate);

 export default router;