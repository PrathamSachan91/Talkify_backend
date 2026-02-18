import Authentication from "./Authentication.js";
import Conversation from "./Conversation.js";
import Message from "./Message.js";
import ConversationMember from "./GroupMember.js";
import ConversationRead from "./conversationReads.js";

/* ============================= */
/* Conversation ↔ Users (PRIVATE) */
/* ============================= */

Conversation.belongsTo(Authentication, {
  as: "user1",
  foreignKey: "user1_id",
});

Conversation.belongsTo(Authentication, {
  as: "user2",
  foreignKey: "user2_id",
});

Conversation.belongsTo(Authentication, {
  as: "createdBy",
  foreignKey: "created_by",
});

/* ============================= */
/* Conversation ↔ Members (GROUP) */
/* ============================= */

Conversation.hasMany(ConversationMember, {
  foreignKey: "conversation_id",
  as: "members",
});

ConversationMember.belongsTo(Conversation, {
  foreignKey: "conversation_id",
});

ConversationMember.belongsTo(Authentication, {
  foreignKey: "user_id",
  as: "user",
});

Authentication.hasMany(ConversationMember, {
  foreignKey: "user_id",
});

/* ============================= */
/* Conversation ↔ Messages */
/* ============================= */

Conversation.hasMany(Message, {
  foreignKey: "conversation_id",
  as: "messages",
});

Message.belongsTo(Conversation, {
  foreignKey: "conversation_id",
});

/* ============================= */
/* Message ↔ Sender */
/* ============================= */

Message.belongsTo(Authentication, {
  foreignKey: "sender_id",
  as: "sender",
});

Authentication.hasMany(Message, {
  foreignKey: "sender_id",
});

Conversation.hasMany(ConversationRead, {
  foreignKey: "conversation_id",
});

ConversationRead.belongsTo(Conversation, {
  foreignKey: "conversation_id",
});

Authentication.hasMany(ConversationRead, {
  foreignKey: "user_id",
});

ConversationRead.belongsTo(Authentication, {
  foreignKey: "user_id",
});

/* ============================= */
/* EXPORTS */
/* ============================= */

export {
  Authentication,
  Conversation,
  Message,
  ConversationMember,
  ConversationRead,
};
