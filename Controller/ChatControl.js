import { Op } from "sequelize";
import {
  Conversation,
  Message,
  Authentication,
  ConversationMember,
} from "../models/index.js";
import { getIO } from "../socket.js";
import cloudinary from "../lib/cloudinary.js";

/* ---------------- GET OR CREATE CONVERSATION ---------------- */
export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    const me = req.user.auth_id;

    if (!userId || userId === me) {
      return res.status(400).json({ message: "Invalid user" });
    }

    let conversation = await Conversation.findOne({
      where: {
        [Op.or]: [
          { user1_id: me, user2_id: userId },
          { user1_id: userId, user2_id: me },
        ],
      },
    });

    if (!conversation) {
      conversation = await Conversation.create({
        type: "private",
        user1_id: me,
        user2_id: userId,
      });
    }

    res.json(conversation);
  } catch (err) {
    console.error("Conversation error:", err);
    res.status(500).json({ message: "Failed to create conversation" });
  }
};

/* ---------------- FETCH MESSAGES ---------------- */
export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const me = req.user.auth_id;

    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (conversation.type === "private") {
      if (![conversation.user1_id, conversation.user2_id].includes(me)) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    if (conversation.type === "group" || conversation.type === "boardcast") {
      const isMember = await ConversationMember.findOne({
        where: {
          conversation_id: conversationId,
          user_id: me,
        },
      });

      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const messages = await Message.findAll({
      where: { conversation_id: conversationId },
      order: [["createdAt", "ASC"]],
      include: {
        model: Authentication,
        as: "sender",
        attributes: ["auth_id", "user_name","profile_image"],
      },
    });

    res.json(messages);
  } catch (err) {
    console.error("Fetch messages error:", err);
    res.status(500).json({ message: "Failed to fetch messages" });
  }
};

/* ---------------- SEND MESSAGE ---------------- */
export const sendMessage = async (req, res) => {
  try {
    const { conversationId, text } = req.body;
    const me = req.user.auth_id;

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID required" });
    }

    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    if (conversation.type === "private") {
      if (![conversation.user1_id, conversation.user2_id].includes(me)) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    if (conversation.type === "group" || conversation.type === "broadcast") {
      const isMember = await ConversationMember.findOne({
        where: {
          conversation_id: conversationId,
          user_id: me,
        },
      });

      if (!isMember) {
        return res.status(403).json({ message: "Access denied" });
      }
    }

    const cleanText = text?.trim() || null;
    const images=[];
    for (const file of req.files || []) {
      const result = await cloudinary.uploader.upload(
        `data:${file.mimetype};base64,${file.buffer.toString("base64")}`,
        {
          folder: "chat-images",
        },
      );
      images.push(result.secure_url);
    }
    if (!cleanText && images.length === 0) {
      return res.status(400).json({ message: "Empty message" });
    }

    let type = "text";
    if (images.length && cleanText) type = "mixed";
    else if (images.length) type = "image";

    const message = await Message.create({
      conversation_id: conversationId,
      sender_id: me,
      text: cleanText,
      images,
      type,
    });

    const fullMessage = await Message.findByPk(message.id, {
      include: {
        model: Authentication,
        as: "sender",
        attributes: ["auth_id", "user_name","profile_image"],
      },
    });
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit(
      "receive_message",
      fullMessage,
    );

    res.status(201).json(message);
  } catch (err) {
    console.error("Send message error:", err);
    res.status(500).json({ message: "Failed to send message" });
  }
};

/* ---------------- GET CONVERSATION META ---------------- */
export const getConversationMeta = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const me = req.user.auth_id;

    const conversation = await Conversation.findByPk(conversationId);

    if (!conversation) {
      return res.status(404).json({ message: "Conversation not found" });
    }

    // PRIVATE CHAT
    if (conversation.type === "private") {
      if (![conversation.user1_id, conversation.user2_id].includes(me)) {
        return res.status(403).json({ message: "Access denied" });
      }

      const receiverId =
        conversation.user1_id === me
          ? conversation.user2_id
          : conversation.user1_id;

      return res.json({
        type: "private",
        receiver_id: receiverId,
      });
    }
    if (conversation.type === "group" || conversation.type === "broadcast") {
      await ConversationMember.findOrCreate({
        where: {
          conversation_id: conversationId,
          user_id: me,
        },
        defaults: { role: "member" },
      });

      return res.json({
        type: conversation.type,
        group_name: conversation.group_name,
      });
    }
  } catch (err) {
    console.error("Conversation meta error:", err);
    res.status(500).json({ message: "Failed to fetch meta" });
  }
};

export const getUserById = async (req, res) => {
  const user = await Authentication.findByPk(req.params.userId, {
    attributes: ["auth_id", "user_name","profile_image"],
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
};
