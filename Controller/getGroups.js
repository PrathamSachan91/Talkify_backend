import { Conversation, ConversationMember } from "../models/index.js";

export const getMyGroups = async (req, res) => {
  const me = req.user.auth_id;

  const groups = await Conversation.findAll({
    where: { type: "group" },
    include: {
      model: ConversationMember,
      as: "members",
      where: { user_id: me },
      attributes: [],
    },
    attributes: ["conversation_id", "group_name"],
  });

  res.json(groups);
};

export const getBroadcast = async (req, res) => {
  try {
    let broadcast = await Conversation.findOne({
      where: { type: "broadcast" },
    });

    if (!broadcast) {
      broadcast = await Conversation.create({
        type: "broadcast",
        group_name: "Public Channel",
        created_by: null,
      });
    }

    res.json(broadcast);
  } catch (err) {
    console.error("Broadcast create error:", err);
    res.status(500).json({ message: "Failed to load broadcast" });
  }
};