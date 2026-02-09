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

/* ✅ CORS (MUST be before routes) */
// app.use(
//   cors({
//     origin: "http://localhost:3000",
//     credentials: true,
//   })
// );
app.use(cors({
  origin: "https://your-frontend.vercel.app",
  credentials: true,
}));


/* Middleware */
app.use(express.json());
app.use(cookieParser());

/* Routes */
app.use("/api", routes);
app.use("/uploads", express.static("uploads"));

/* Init Socket */
initSocket(server);

server.listen(process.env.PORT, () => {
  console.log(`🚀 Server is running on port ${process.env.PORT}`);
});

