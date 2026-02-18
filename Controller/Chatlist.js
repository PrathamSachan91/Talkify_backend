import { Authentication, Conversation} from "../models/index.js";

export const getAllUsers = async (req, res) => {
  const users = await Authentication.findAll({
    attributes: ["auth_id", "user_name", "profile_image", "last_active","email","user_status"],
  });
  res.json({ users });
};
