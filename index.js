import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import routes from "./routes/route.js";
import { initSocket } from "./socket.js";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();
const server = http.createServer(app);
// app.set("trust proxy", 1);

app.use(
  cors({
    origin: "https://talkify-frontend-qql7.onrender.com",
    // origin: "http://localhost:3000",
    credentials: true,
  })
);

/* Middleware */
app.use(express.json());
app.use(cookieParser());

/* Routes */
app.use("/api", routes);
app.use("/uploads", express.static("uploads"));

/* Init Socket */
initSocket(server);
app.get("/",(req,res) => {
  return res.status(200).json({message:"Server is running"})
})
server.listen(process.env.PORT, () => {
  console.log(`🚀 Server is running on port ${process.env.PORT}`);
});

