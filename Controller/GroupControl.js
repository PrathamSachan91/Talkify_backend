import sequelize from "../lib/db.js";

export const createGroup = async (req, res) => {
  try {
    const { group_name, members } = req.body;
    const me = req.user.auth_id;

    if (!group_name || !Array.isArray(members) || members.length === 0) {
      return res.status(400).json({ message: "Invalid data" });
    }

    const uniqueMembers = [...new Set(members)];

    const result = await sequelize.query(
      `CALL sp_talkify_create_group(:creatorId, :groupName, :members)`,
      {
        replacements: {
          creatorId: me,
          groupName: group_name,
          members: JSON.stringify(uniqueMembers),
        },
      }
    );

    const group = Array.isArray(result) ? result[0] : result;

    res.status(201).json(group);
  } catch (err) {
    console.error("Create group error:", err);
    res.status(500).json({ message: "Failed to create group" });
  }
};
