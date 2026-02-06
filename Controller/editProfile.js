import cloudinary from "../lib/cloudinary.js";
import { Authentication } from "../models/index.js";

export const EditProfile = async (req, res) => {
  try {
    console.log("FILE:", req.file);
    const me = req.user.auth_id;
    const { user_name } = req.body;

    const user = await Authentication.findByPk(me);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    let profileImageUrl = user.profile_image;

    if (req.file) {
      const result = await cloudinary.uploader.upload(
        `data:${req.file.mimetype};base64,${req.file.buffer.toString("base64")}`,
        {
          folder: "profile-images",
          transformation: [
            { width: 300, height: 300, crop: "fill", gravity: "face" },
            { quality: "auto" },
          ],
        },
      );

      profileImageUrl = result.secure_url;
    }

    await user.update({
      user_name: user_name ?? user.user_name,
      profile_image: profileImageUrl,
    });

    res.json({
      user: {
        auth_id: user.auth_id,
        user_name: user.user_name,
        email: user.email,
        profile_image: user.profile_image,
      },
    });
  } catch (err) {
    console.error("Edit profile error:", err);
    res.status(500).json({ message: "Failed to update profile" });
  }
};
