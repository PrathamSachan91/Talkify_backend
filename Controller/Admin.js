import { Conversation} from "../models/index.js";

export const fetchAllGroup= async(req,res) =>{
  const groups=await Conversation.findAll({
    where:{
      type:"group"
    },
    attributes: ["conversation_id", "group_name","group_image"]
  })
  return res.json(groups);
}