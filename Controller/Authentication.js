import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import Authentication from "../models/Authentication.js";
import AuthToken from "../models/token.js";
import crypto from "crypto";
import { OAuth2Client } from "google-auth-library";
import { getIO } from "../socket.js";
import Otp from "../models/otp.js"
import { getOtpEmailHtml } from "../utils/email.js";
import nodemailer from "nodemailer"

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.MAIL_USER,
    pass: process.env.MAIL_PASS,
  },
});

const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

/* ---------------- SIGNUP ---------------- */
export const Signin = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    const exists = await Authentication.findOne({ where: { email } });

    if (exists) {
      return res.status(409).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await Authentication.create({
      user_name: name,
      email,
      password: hashedPassword,
      created_at: new Date(),
      last_active: new Date(),
    });

    const token = jwt.sign({ auth_id: user.auth_id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    await AuthToken.create({
      auth_id: user.auth_id,
      token: hashToken(token),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // res.cookie("access_token", token, {
    //   httpOnly: true,
    //   secure: true, // 🔥 REQUIRED on Render
    //   sameSite: "none", // 🔥 REQUIRED for cross-site cookies
    //   path: "/", 
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });

    const io = getIO();
    io.emit("user_created", {
      auth_id: user.auth_id,
      user_name: user.user_name,
    });

    return res.status(201).json({
      message: "Account created successfully",
      user: {
        auth_id: user.auth_id,
        user_name: user.user_name,
        email: user.email,
        profile_image: user.profile_image,
      },
    });
  } catch (error) {
    console.error("Signup error:", error);
    return res.status(500).json({ message: "Server error" });
  }
};

/* ---------------- LOGIN ---------------- */
export const Login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    const user = await Authentication.findOne({ where: { email } });

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ auth_id: user.auth_id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    await AuthToken.destroy({
      where: { auth_id: user.auth_id },
    });

    await AuthToken.create({
      auth_id: user.auth_id,
      token: hashToken(token),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    await user.update({ last_active: new Date() });

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // res.cookie("access_token", token, {
    //   httpOnly: true,
    //   secure: true, // 🔥 REQUIRED on Render
    //   sameSite: "none", // 🔥 REQUIRED for cross-site cookies
    //   path: "/", 
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });

    return res.json({
      message: "Login successful",
      user: {
        auth_id: user.auth_id,
        user_name: user.user_name,
        email: user.email,
        profile_image: user.profile_image,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: "Server error" });
  }
};

export const googleLogin = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!credential) {
      return res.status(400).json({ message: "Google token missing" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    });

    const payload = ticket.getPayload();
    if (!payload?.email) {
      return res.status(401).json({ message: "Invalid Google token" });
    }

    const { email } = payload;

    // 🔒 Allow only registered users
    const user = await Authentication.findOne({ where: { email } });
    if (!user) {
      return res.status(403).json({
        message: "Account not found. Please sign up first.",
      });
    }

    await user.update({ last_active: new Date() });

    const token = jwt.sign({ auth_id: user.auth_id }, process.env.JWT_SECRET, {
      expiresIn: "7d",
    });

    await AuthToken.destroy({
      where: { auth_id: user.auth_id },
    });

    await AuthToken.create({
      auth_id: user.auth_id,
      token: hashToken(token),
      expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    });

    res.cookie("access_token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    // res.cookie("access_token", token, {
    //   httpOnly: true,
    //   secure: true, // 🔥 REQUIRED on Render
    //   sameSite: "none", // 🔥 REQUIRED for cross-site cookies
    //   path: "/", 
    //   maxAge: 7 * 24 * 60 * 60 * 1000,
    // });

    res.json({ message: "Google login successful" });
  } catch (err) {
    console.error("Google Auth Error:", err);
    res.status(500).json({ message: "Google authentication failed" });
  }
};

/* ---------------- GET CURRENT USER ---------------- */
export const getUser = async (req, res) => {
  res.json({ user: req.user });
};

export const Logout = async (req, res) => {
  const token = req.cookies?.access_token;

  if (token) {
    const tokenHash = hashToken(token);
    await AuthToken.destroy({ where: { token: tokenHash } });
  }

  // res.clearCookie("access_token", {
  //   httpOnly: true,
  //   secure: true,
  //   sameSite: "none",
  //   path: "/", 
  // });

  res.clearCookie("access_token", {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
  });

  res.json({ message: "Logged out successfully" });
};

export const sendOTP = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) return res.status(400).json({ message: "Email required" });

    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiry = new Date(Date.now() + 2 * 60 * 1000);

    await Otp.destroy({ where: { email } });
    await Otp.create({ email, otp, expires_at: expiry });

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: email,
      subject: "OTP Verification",
      html: getOtpEmailHtml(otp),
    });

    res.json({ message: "OTP sent successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};

export const verifyOTP = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp)
      return res.status(400).json({ message: "Email & OTP required" });

    const record = await Otp.findOne({ where: { email } });
    if (!record) return res.status(400).json({ message: "OTP not found" });

    if (new Date() > record.expires_at) {
      await Otp.destroy({ where: { email } });
      return res.status(400).json({ message: "OTP expired" });
    }

    if (record.otp !== otp)
      return res.status(400).json({ message: "Invalid OTP" });

    await Otp.destroy({ where: { email } });
    res.json({ message: "OTP verified successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
};
