import { DataTypes } from "sequelize";
import sequelize from "../lib/db.js";
import Authentication from "./Authentication.js";

const AuthToken = sequelize.define(
  "AuthToken",
  {
    token_id: {
      type: DataTypes.INTEGER,
      autoIncrement: true,
      primaryKey: true,
    },

    auth_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },

    token: {
      type: DataTypes.STRING(512),
      allowNull: false,
    },

    expires_at: {
      type: DataTypes.DATE,
      allowNull: false,
    },

    is_revoked: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  },
  {
    tableName: "auth_tokens",
    freezeTableName: true,
    timestamps: false,
  }
);

Authentication.hasMany(AuthToken, {
  foreignKey: "auth_id",
  onDelete: "CASCADE",
});

AuthToken.belongsTo(Authentication, {
  foreignKey: "auth_id",
});

export default AuthToken;
