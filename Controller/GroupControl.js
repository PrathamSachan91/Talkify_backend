import { Conversation, ConversationMember, Authentication } from "../models/index.js";

export const createGroup = async (req, res) => {
  try {
    const { group_name, members } = req.body;
    const me = req.user.auth_id;

    if (!group_name || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const conversation = await Conversation.create({
      type: "group",
      created_by: me,
      group_name,
    });

    await ConversationMember.create({
      conversation_id: conversation.conversation_id,
      user_id: me,
      role: "admin",
    });

    const uniqueMembers = [...new Set(members)].filter((id) => id !== me);

    const bulk = uniqueMembers.map((id) => ({
      conversation_id: conversation.conversation_id,
      user_id: id,
      role: "member",
    }));

    if (bulk.length) {
      await ConversationMember.bulkCreate(bulk);
    }

    res.status(201).json({
      conversation_id: conversation.conversation_id,
      group_name: conversation.group_name,
    });
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ message: "Failed to create group" });
  }
};
