import express from "express";
import { Signin, Login,getUser,Logout,googleLogin } from "../Controller/Authentication.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getAllUsers } from "../Controller/Chatlist.js";
import { getMessages, getOrCreateConversation, sendMessage,getConversationMeta,getUserById } from "../Controller/ChatControl.js";
import { upload } from "../utils/upload.js";
import { createGroup, } from "../Controller/GroupControl.js";
import { getMyGroups,getBroadcast } from "../Controller/getGroups.js";

const router = express.Router();

router.post("/auth/signin", Signin);
router.post("/auth/login", Login);
router.get("/auth/me" ,requireAuth, getUser);
router.get("/auth/logout",Logout,requireAuth);
router.post("/auth/google",googleLogin)
router.get("/ChatList",requireAuth,getAllUsers);
router.post("/chat/getconversation",requireAuth,getOrCreateConversation);
router.get("/chat/messages/:conversationId",requireAuth,getMessages);
router.post("/chat/message",requireAuth,upload.array("images",5),sendMessage);
router.get("/user/:userId", requireAuth, getUserById);
router.get("/chat/getmeta/:conversationId", requireAuth,getConversationMeta);
router.post("/conversations/creategroup",requireAuth,createGroup);
router.get("/groupList", requireAuth, getMyGroups);
router.get("/boardcastList",requireAuth,getBroadcast)

export default router;
