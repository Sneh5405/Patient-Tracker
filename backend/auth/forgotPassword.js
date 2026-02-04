import prisma from "../client.js";
import { tokenGenerate } from "./jwtToken.js";
import { sendPasswordResetEmail } from "../utils/emailService.js";

const forgotPassword = async (req, res) => {
  const { email, role } = req.body;

  if (!email || !role) {
    return res.status(400).json({ message: "Email and role are required" });
  }

  try {
    // Find the user based on role
    let user;
    if (role === "patient") {
      user = await prisma.Patient.findUnique({
        where: { email: email },
      });
    } else if (role === "doctor") {
      user = await prisma.Doctor.findUnique({
        where: { email: email },
      });
    } else {
      return res.status(400).json({ message: "Invalid role provided" });
    }

    if (!user) {
      // For security reasons, don't reveal if the email exists or not
      return res.status(200).json({ 
        message: "If an account with that email exists, a password reset link has been sent." 
      });
    }

    // Generate reset token (valid for 1 hour)
    const token = tokenGenerate({
      id: user.id,
      email: user.email,
      role: role,
      purpose: 'password-reset'
    }, "1h"); // Set to expire in 1 hour

    // Send reset email
    await sendPasswordResetEmail(user.email, user.name, token);

    // Always return success to prevent email enumeration
    return res.status(200).json({ 
      message: "If an account with that email exists, a password reset link has been sent." 
    });
  } catch (err) {
    console.error('Error in forgot password:', err);
    return res.status(500).json({ message: "Server error processing request" });
  }
};

export default forgotPassword; 