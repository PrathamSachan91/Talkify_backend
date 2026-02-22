import { Authentication, Conversation} from "../models/index.js";

export const fetchAllGroup= async(req,res) =>{
  const groups=await Conversation.findAll({
    where:{
      type:"group"
    },
    attributes: ["conversation_id","group_name","group_image"]
  })
  return res.json(groups);
}

export const handleStatus = async (req, res) => {
  try {
    const { auth_id } = req.body;

    const user = await Authentication.findOne({ where: { auth_id } });
    if (!user) return res.status(404).json({ message: "User not found" });

    const newStatus =
      user.user_status === "Active" ? "Banned" : "Active";

    await Authentication.update(
      { user_status: newStatus },
      { where: { auth_id } }
    );

    return res.json({
      success: true,
      auth_id,
      status: newStatus,
    });
  } catch (err) {
    return res.status(500).json({ message: "Status toggle failed" });
  }
};

export const fetchAllConversation = async(req,res) => {
  const conversation=await Conversation.findAll({
    attributes: ["conversation_id","updatedAt","last_message","type","message_count","group_name","user1_id","user2_id","created_by"],
    include: [
      {
        model: Authentication,
        as: "user1",
        attributes: ["auth_id", "user_name","profile_image"],
      },
      {
        model: Authentication,
        as: "user2",    
        attributes: ["auth_id", "user_name","profile_image"],
      },
      {
        model: Authentication,
        as: "createdBy",    
        attributes: ["auth_id", "user_name"],
      },
    ],
    order: [["conversation_id", "ASC"]],
  })
  return res.json(conversation);
}

export const dropConversation = async(req,res) => {
  const {conversationId} =req.body;
  await Conversation.destroy({
    where: {
      conversation_id:conversationId,
    }
  })
}