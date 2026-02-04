import dotenv from "dotenv";
import { tokenGenerate } from "./jwtToken.js";
import prisma from "../client.js";
import bcrypt from "bcryptjs";

// Ensure environment variables are loaded before token generation
dotenv.config();

const signin = async (req, res) => {
  const { email, password, role } = req.body;

  try {
    let user;
    if (role === "patient") {
      user = await prisma.Patient.findUnique({
        where: { email: email },
      });
    } else if (role === "doctor") {
      user = await prisma.Doctor.findUnique({
        where: { email: email },
      });
    }

    // Don't hash password again, instead use bcrypt.compare
    if (!user) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Use bcrypt.compare to check if the passwords match
    const passwordMatch = await bcrypt.compare(password, user.password);

    if (!passwordMatch) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    // Before generating token, verify JWT_SECRET is available
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is missing in the environment variables");
      return res.status(500).json({ message: "Server configuration error" });
    }

    // Generate token with error handling
    let token;
    try {
      token = tokenGenerate({
        id: user.id,
        email: user.email,
        name: user.name,
        role: role,
        specialization: role === "doctor" ? user.specialization : undefined
      });
    } catch (tokenError) {
      console.error("Error generating token:", tokenError);
      return res
        .status(500)
        .json({ message: "Authentication error: Failed to generate token" });
    }

    return res.json({
      message: "Sign-in successful",
      token: token,
      role: role,
    });
  } catch (err) {
    console.error("Error in signing in:", err);
    res.status(500).json({ message: err.message });
  }
};

export default signin;
