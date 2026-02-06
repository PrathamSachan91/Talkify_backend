import { Server } from "socket.io";
import cookie from "cookie";
import jwt from "jsonwebtoken";

let io;

export const initSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: "http://localhost:3000",
      credentials: true,
    },
  });

  io.use((socket, next) => {
    const cookies = cookie.parse(socket.handshake.headers.cookie || "");

    const token = cookies.access_token; // name must match login cookie

    if (!token) {
      return next(new Error("Not authenticated"));
    }

    try {
      const user = jwt.verify(token, process.env.JWT_SECRET);
      socket.user = user;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket) => {
    console.log("🟢 User connected:", socket.id);

    socket.on("join_conversation", (conversationId) => {
      socket.join(`conversation-${conversationId}`);
      console.log(`Joined conversation-${conversationId}`);
    });
    
    socket.on("typing", ({ conversationId, userId }) => {
      socket.to(`conversation-${conversationId}`).emit("user_typing", {
        conversationId,
        userId,
      });
    });

    socket.on("disconnect", () => {
      console.log("🔴 User disconnected:", socket.id);
    });
  });

  return io;
};
export const getIO = () => {
  if (!io) throw new Error("Socket.io not initialized");
  return io;
};
