import { Op, TIME, where } from "sequelize";
import {
  Conversation,
  Message,
  Authentication,
  ConversationMember,
} from "../models/index.js";
import { getIO } from "../socket.js";
import cloudinary from "../lib/cloudinary.js";
import sequelize from "../lib/db.js";

export const getOrCreateConversation = async (req, res) => {
  try {
    const { userId } = req.body;
    const me = req.user.auth_id;

    if (!userId || userId === me) {
      return res.status(400).json({ message: "Invalid user" });
    }

    const result = await sequelize.query(
      `CALL sp_talkify_get_or_create_conversation(:user1,:user2)`,
      {
        replacements: {
          user1: userId,
          user2: me,
        },
      },
    );
    const conversation = Array.isArray(result) ? result[0] : result;
    res.json(conversation);
  } catch (err) {
    console.error("Conversation error:", err);
    res.status(500).json({ message: "Failed to create conversation" });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const me = req.user.auth_id;

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID required" });
    }

    const results = await sequelize.query(
      "CALL sp_talkify_get_messages(:conversationId, :userId)",
      {
        replacements: {
          conversationId: Number(conversationId),
          userId: me,
        },
      },
    );
    return res.json(results);
  } catch (err) {
    console.error("Fetch messages error:", err);

    if (err.parent?.sqlState === "45000") {
      return res.status(403).json({ message: err.parent.sqlMessage });
    }

    return res.status(500).json({ message: "Failed to fetch messages" });
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

    const cleanText = text?.trim() || null;
    const images = [];
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

    const [result] = await sequelize.query(
      `CALL sp_talkify_send_message(
    :conversationId,
    :senderId,
    :text,
    :images,
    :type
  )`,
      {
        replacements: {
          conversationId,
          senderId: me,
          text: cleanText,
          images: JSON.stringify(images),
          type,
        },
      },
    );

    const message = result[0];
    const now = new Date().toISOString();

    const io = getIO();

    io.to(`conversation-${conversationId}`).emit("receive_message", message);

    io.to(`conversation-${conversationId}`).emit("last_message", {
      conversationId,
      text: cleanText,
      updatedAt: now,
      last_sender: me,
    });

    io.to(`conversation-${conversationId}`).emit("unread_increment", {
      conversationId,
      senderId: me,
    });

    res.status(201).json(message);
  } catch (err) {
    console.error("Send message error:", err);
    if (err.parent?.sqlState === "45000") {
      return res.status(403).json({ message: err.parent.sqlMessage });
    }
    res.status(500).json({ message: "Failed to send message" });
  }
};

export const getConversationMeta = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const me = req.user.auth_id;
    const conversationNum = Number(conversationId);
    const result = await sequelize.query(
      `CALL sp_talkify_get_conversation_meta(:conversationId, :userId)`,
      {
        replacements: {
          conversationId: conversationNum,
          userId: me,
        },
      },
    );
    res.json(Array.isArray(result) ? result[0] : result);
  } catch (err) {
    console.error("Conversation meta error:", err);

    if (err.parent?.sqlState === "45000") {
      return res.status(403).json({ message: err.parent.sqlMessage });
    }

    res.status(500).json({ message: "Failed to fetch meta" });
  }
};

export const getUserById = async (req, res) => {
  const user = await Authentication.findByPk(req.params.userId, {
    attributes: ["auth_id", "user_name", "profile_image", "last_active"],
  });

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(user);
};

export const deleteConversation = async (req, res) => {
  try {
    const me = req.user.auth_id;
    const { conversationId } = req.body;

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID required" });
    }

    await sequelize.query(
      `CALL sp_talkify_delete_conversation(:conversationId, :user)`,
      {
        replacements: {
          conversationId,
          user: me,
        },
      },
    );

    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("delete_message", {
      conversationId,
      userId: me,
    });

    res.json({ message: "Chat deleted for current user" });
  } catch (err) {
    console.error("Delete chat error:", err);
    res.status(500).json({ message: "Failed to delete chat" });
  }
};

export const deleteMessageMe = async (req, res) => {
  try {
    const me = req.user.auth_id;
    const { messageId, conversationId } = req.body;

    await sequelize.query(
      `CALL sp_talkify_delete_message_me(:messageId, :user)`,
      {
        replacements: {
          messageId,
          user: me,
        },
      },
    );

    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("delete_message", {
      messageId,
      userId: me,
    });

    res.json({ message: "Chat deleted for current user" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete chat" });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const me = req.user.auth_id;
    const { messageId, conversationId } = req.body;

    const message = await Message.findByPk(messageId);

    if (!message) {
      return res.status(404).json({ message: "Message not found" });
    }

    if (message.sender_id !== me) {
      return res.status(403).json({ message: "Not allowed" });
    }

    await message.destroy();

    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("delete_message", {
      messageId,
    });

    res.json({ message: "Message deleted for everyone" });
  } catch (err) {
    res.status(500).json({ message: "Failed to delete message" });
  }
};

export const fetchConversationsWithUnread = async (req, res) => {
  try {
    const me = req.user.auth_id;

    const result = await sequelize.query(
      `CALL sp_talkify_fetch_unread(:userId)`,
      {
        replacements: { userId: me },
      },
    );

    res.json(Array.isArray(result) ? result : []);
  } catch (err) {
    console.error("Fetch conversations error:", err);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};

export const markConversationRead = async (req, res) => {
  try {
    const { conversationId, lastMessageId } = req.body;
    const userId = req.user.auth_id;

    if (!conversationId || !lastMessageId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    await sequelize.query(
      `CALL sp_talkify_mark_conversation_read(:cid, :uid, :mid)`,
      {
        replacements: {
          cid: conversationId,
          uid: userId,
          mid: lastMessageId,
        },
      },
    );

    // Emit to all users in conversation that this user marked it as read
    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("conversation_read", {
      conversationId,
      userId,
    });

    res.json({ success: true });
  } catch (err) {
    console.error("Mark read error:", err);
    res.status(500).json({ message: "Failed to mark as read" });
  }
};

export const editMessage = async (req, res) => {
  try {
    const { messageId, text } = req.body;
    const [rowsUpdated] = await Message.update(
      { text },            
      { where: { id: messageId } }
    );
    if (rowsUpdated === 0) {
      return res.status(404).json({ message: "Message not found" });
    }
    const updated = await Message.findByPk(messageId);
    return res.status(200).json(updated);

  } catch (err) {
    console.error("editMessage error:", err);
    res.status(500).json({ message: "Failed to update message" });
  }
};
