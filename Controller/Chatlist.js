import {Authentication} from "../models/index.js";

export const getAllUsers = async (req, res) => {
  const users = await Authentication.findAll({
    attributes: ["auth_id", "user_name"],
  });

  res.json({ users });
};
