import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";
import Authentication from "./models/Authentication.js";

let io;
const onlineUsers = new Map(); // userId -> socketId

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      // origin: "https://talkify-frontend-qql7.onrender.com",
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");
    const token = cookies.access_token;

    if (!token) return next(new Error("Not authenticated"));

    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    const userId = socket.user.auth_id;
    console.log("🟢 Connected:", socket.id, "user:", userId);

    // register new socket
    onlineUsers.set(userId, socket.id);
    socket.userId = userId;
    socket.emit("online_users", Array.from(onlineUsers.keys()));

    // notify others
    socket.broadcast.emit("user_status", {
      userId,
      status: "online",
    });

    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation-${conversationId}`);
    });

    socket.on("typing", ({ conversationId }) => {
      socket.to(`conversation-${conversationId}`).emit("user_typing", {
        conversationId,
        userId,
      });
    });

    socket.on("disconnect", async () => {
      console.log("🔴 Disconnected:", socket.id);

      // only remove if THIS socket is the active one
      if (onlineUsers.get(userId) === socket.id) {
        onlineUsers.delete(userId);

        await Authentication.update(
          { last_active: new Date() },
          { where: { auth_id: userId } }
        );

        socket.broadcast.emit("user_status", {
          userId,
          status: "offline",
        });
      }
    });
  });

  return io;
};

export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
