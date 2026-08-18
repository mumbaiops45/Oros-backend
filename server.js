import "dotenv/config"
import express from "express"
import app from "./src/app.js";
const PORT = process.env.PORT;


 app.listen(PORT,()=>{
    console.log(`server running at : http://localhost:${PORT}`);
 })