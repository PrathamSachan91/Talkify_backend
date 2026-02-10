import { DataTypes } from "sequelize";
import sequelize from "../lib/db.js";

const Message = sequelize.define(
  "Message",
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
    type: {
      type: DataTypes.ENUM("text", "image","mixed"),
      allowNull: false,
      defaultValue: "text",
    },
    sender_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    images: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    deleted_for: {
      type: DataTypes.JSON,
      allowNull:true,
      defaultValue: [],
    }
  },
  {
    tableName: "messages",
    timestamps: true,
  }
);


export default Message;
