import express from "express";
import { Signin, Login,getUser,Logout,googleLogin } from "../Controller/Authentication.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getAllUsers } from "../Controller/Chatlist.js";
import { getMessages, getOrCreateConversation, sendMessage,getConversationMeta,getUserById, deleteConversation, deleteMessage, deleteMessageMe } from "../Controller/ChatControl.js";
import { upload } from "../middleware/upload.js";
import { createGroup, } from "../Controller/GroupControl.js";
import { getMyGroups,getBroadcast } from "../Controller/getGroups.js";
import { EditGroup, EditProfile } from "../Controller/editProfile.js";
import { imageList } from "../Controller/Gallery.js";

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
router.post("/editProfile",requireAuth,upload.single("profile_image"),EditProfile);
router.get("/messages/images/:conversationId",requireAuth,imageList)
router.post("/editGroup",requireAuth,upload.single("group_image"),EditGroup)
router.post("/deleteConversation",requireAuth,deleteConversation);
router.post("/deleteMessageMe",requireAuth,deleteMessageMe)
router.post("/deleteMessage",requireAuth,deleteMessage);

export default router;
