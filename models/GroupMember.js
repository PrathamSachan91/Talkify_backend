import { DataTypes } from "sequelize";
import sequelize from "../lib/db.js";

const ConversationMember = sequelize.define(
  "ConversationMember",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    conversation_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    role: {
      type: DataTypes.ENUM("admin", "member"),
      defaultValue: "member",
    },
  },
  {
    tableName: "conversation_members",
    timestamps: true,
  }
);

export default ConversationMember;
