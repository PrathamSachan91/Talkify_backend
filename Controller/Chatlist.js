import { Op } from "sequelize";
import { Authentication, Conversation, ConversationMember } from "../models/index.js";

export const getAllUsers = async (req, res) => {
  const users = await Authentication.findAll({
    attributes: ["auth_id", "user_name", "profile_image", "last_active"],
  });

  res.json({ users });
};

export const fetchLast = async (req, res) => {
  try {
    const me = req.user.auth_id;

    const conversations = await Conversation.findAll({
      where: {
        [Op.or]: [
          { user1_id: me },
          { user2_id: me },
          {
            type: {
              [Op.in]: ['group', 'broadcast']
            }
          }
        ]
      },
      attributes: [
        "conversation_id",
        "type",
        "last_message",
        "updatedAt",
        "user1_id",
        "user2_id",
        "last_sender"
      ],
      order: [["updatedAt", "DESC"]],
    });

    const filteredConversations = await Promise.all(
      conversations.map(async (conv) => {
        if (conv.type === 'private') {
          return conv;
        }

        // For groups and broadcasts, check membership
        if (conv.type === 'group' || conv.type === 'broadcast') {
          const isMember = await ConversationMember.findOne({
            where: {
              conversation_id: conv.conversation_id,
              user_id: me
            }
          });

          return isMember ? conv : null;
        }

        return null;
      })
    );

    // Remove null values (conversations where user is not a member)
    const userConversations = filteredConversations.filter(conv => conv !== null);

    // Return array directly
    res.json(userConversations);
  } catch (err) {
    console.error("Fetch last messages error:", err);
    res.status(500).json({ message: "Failed to fetch conversations" });
  }
};