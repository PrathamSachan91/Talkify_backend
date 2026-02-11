import { DataTypes } from "sequelize";
import sequelize from "../lib/db.js";

const Otp = sequelize.define(
  "Otp",
  {
    email: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    otp: {
      type: DataTypes.STRING(6),
      allowNull: false,
    },
    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  },
  {
    tableName: "otp_talkify",
    timestamps: false,
  }
);

export default Otp;
