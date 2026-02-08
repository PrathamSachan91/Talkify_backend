import { DataTypes } from "sequelize";
import sequelize from "../lib/db.js";

const Conversation = sequelize.define(
  "Conversation",
  {
    conversation_id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },

    type: {
      type: DataTypes.ENUM("private", "group","broadcast"),
      allowNull: false,
    },

    user1_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    user2_id: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },

    // ONLY group chat
    created_by: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    group_name: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    group_image:{
      type:DataTypes.STRING,
      allowNull:true,
    }
  },
  {
    tableName: "conversations",
    timestamps: true,
  }
);

export default Conversation;
