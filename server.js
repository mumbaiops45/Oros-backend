import "dotenv/config"
import express from "express"
import app from "./src/app.js";
import http from "http"
import { Server } from "socket.io";


const PORT = process.env.PORT;

const server = http.createServer(app);

export const io = new Server(server, {
   cors: {
      origin: true,
      credentials: true
   }
});
io.on("connection", (socket) => {

   console.log("connected", socket.id);
   socket.on("join_admin", () => {
      socket.join("admin")
      console.log("admin join");

   })

   socket.on(`customer_join`, (userId) => {
      socket.join(`customer_${userId}`)
      console.log("customer join");

   })

   socket.on("disconnect", () => {
      console.log("socket disconnect", socket.id);

   })

})

server.listen(PORT, () => {
   console.log(`server running at : http://localhost:${PORT}`);
});