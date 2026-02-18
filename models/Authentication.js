import { DataTypes } from "sequelize";
import sequelize from "../lib/db.js";

const Authentication = sequelize.define(
  "Authentication",
  {
    auth_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    user_name: {
      type: DataTypes.STRING,
      allowNull: false,
    },

    email: {
      type: DataTypes.STRING,
      unique: true,
      allowNull: false,
    },

    password: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    created_at: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    last_active: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    profile_image:{
      type:DataTypes.STRING,
      allowNull:true,
    },
    user_type:{
      type:DataTypes.ENUM("user", "admin"),
      defaultValue:"admin",
    },
    user_status:{
      type:DataTypes.ENUM("Active", "Banned"),
      defaultValue:"admin",
    }
  },
  {
    tableName: "authentication",
    freezeTableName: true,
    timestamps: false,
  },
);

export default Authentication;
