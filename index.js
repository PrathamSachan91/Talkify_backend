import express from "express";
import http from "http";
import cookieParser from "cookie-parser";
import routes from "./routes/route.js";
import { initSocket } from "./socket.js";
import dotenv from "dotenv";
import cors from "cors";
import sequelize from "./lib/db.js";

dotenv.config();

const app = express();
const server = http.createServer(app);
app.set("trust proxy", 1);

/* ✅ CORS (MUST be before routes) */
app.use(
  cors({
    origin: "https://talkify-frontend-qql7.onrender.com",
    credentials: true,
  })
);

/* Middleware */
app.use(express.json());
app.use(cookieParser());
(async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected successfully");
  } catch (error) {
    console.error("❌ Unable to connect to the database:", error);
  }
})();

/* Routes */
app.use("/api", routes);
app.use("/uploads", express.static("uploads"));

/* Init Socket */
initSocket(server);

server.listen(process.env.PORT, () => {
  console.log(`🚀 Server is running on port ${process.env.PORT}`);
});

