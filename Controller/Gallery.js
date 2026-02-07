import { Message,Authentication } from "../models/index.js";

export const imageList = async (req, res) => {
  try {
    const { conversationId } = req.params;

    const messages = await Message.findAll({
      where: {
        conversation_id: conversationId,
      },
      attributes: ["id", "images", "createdAt", "sender_id"],
      include: [
        {
          model: Authentication,
          as: "sender",
          attributes: ["auth_id", "user_name", "profile_image"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // ✅ FILTER IMAGES IN JS (NOT SQL)
    const result = [];

    for (const msg of messages) {
      if (Array.isArray(msg.images) && msg.images.length > 0) {
        for (const url of msg.images) {
          result.push({
            id: msg.id,
            url,
            createdAt: msg.createdAt,
            sender: msg.sender,
          });
        }
      }
    }

    res.json(result);
  } catch (err) {
    console.error("Image list error:", err);
    res.status(500).json({ message: "Failed to fetch images" });
  }
};
