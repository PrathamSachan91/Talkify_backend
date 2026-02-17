import { Authentication} from "../models/index.js";
import sequelize from "../lib/db.js";

export const getAllUsers = async (req, res) => {
  const users = await Authentication.findAll({
    attributes: ["auth_id", "user_name", "profile_image", "last_active"],
  });
  res.json({ users });
};

// export const fetchLast = async (req, res) => {
//   try {
//     const me = req.user.auth_id;

//     const result = await sequelize.query(
//       `CALL sp_talkify_fetch_last_conversations(:userId)`,
//       { replacements: { userId: me } }
//     );

//     res.json(Array.isArray(result) ? result : []);
//   } catch (err) {
//     console.error("Fetch last messages error:", err);
//     res.status(500).json({ message: "Failed to fetch conversations" });
//   }
// };