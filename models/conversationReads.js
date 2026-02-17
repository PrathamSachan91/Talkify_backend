import { DataTypes } from "sequelize";
import sequelize from "../lib/db.js";

const ConversationRead = sequelize.define(
  "ConversationRead",
  {
    conversation_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },

    user_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      allowNull: false,
    },

    last_read_message_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },

    updated_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "conversation_reads",
    timestamps: false,
  }
);

export default ConversationRead;
