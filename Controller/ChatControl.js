import { Op, TIME, where } from "sequelize";
import {
  Conversation,
  Message,
  Authentication,
  ConversationMember,
} from "../models/index.js";
import { getIO } from "../socket.js";
import cloudinary from "../lib/cloudinary.js";
import Sequelize from "sequelize";
import sequelize from "../lib/db.js";
import { QueryTypes } from "sequelize";

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

// export const getMessages = async (req, res) => {
//   try {
//     const { conversationId } = req.params;
//     const me = req.user.auth_id;

//     const conversation = await Conversation.findByPk(conversationId);

//     if (!conversation) {
//       return res.status(404).json({ message: "Conversation not found" });
//     }

//     if (conversation.type === "private") {
//       if (![conversation.user1_id, conversation.user2_id].includes(me)) {
//         return res.status(403).json({ message: "Access denied" });
//       }
//     }

//     if (conversation.type === "group" || conversation.type === "broadcast") {
//       const isMember = await ConversationMember.findOne({
//         where: {
//           conversation_id: conversationId,
//           user_id: me,
//         },
//       });

//       if (!isMember) {
//         return res.status(403).json({ message: "Access denied" });
//       }
//     }

//     const messages = await Message.findAll({
//       where: {
//         conversation_id: conversationId,

//         [Op.and]: [
//           Sequelize.where(
//             Sequelize.fn(
//               "JSON_CONTAINS",
//               Sequelize.fn(
//                 "IFNULL",
//                 Sequelize.col("deleted_for"),
//                 Sequelize.literal("JSON_ARRAY()"),
//               ),
//               Sequelize.fn("JSON_ARRAY", me),
//             ),
//             0,
//           ),
//         ],
//       },
//       order: [["createdAt", "ASC"]],
//       include: {
//         model: Authentication,
//         as: "sender",
//         attributes: ["auth_id", "user_name", "profile_image"],
//       },
//     });

//     res.json(messages);
//   } catch (err) {
//     console.error("Fetch messages error:", err);
//     res.status(500).json({ message: "Failed to fetch messages" });
//   }
// };

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const me = req.user.auth_id;

    if (!conversationId) {
      return res.status(400).json({ message: "Conversation ID required" });
    }

    // Don't destructure yet - get the full result first
    const results = await sequelize.query(
      "CALL sp_talkify_get_messages(:conversationId, :userId)",
      {
        replacements: {
          conversationId: Number(conversationId),
          userId: me,
        },
      }
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

    const io = getIO();
    io.to(`conversation-${conversationId}`).emit("receive_message", message);

    const now=new TIME();
    io.to(`conversation-${conversationId}`).emit("last_message", {
      conversationId,
      text: cleanText,
      updatedAt: now,
      last_sender: me,
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
        created_by: conversation.created_by,
        group_image: conversation.group_image,
      });
    }
  } catch (err) {
    console.error("Conversation meta error:", err);
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

    if(!conversationId){
      return res.status(400).json({message:"Conversation ID required"});
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
