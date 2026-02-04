import prisma from "../client.js";
import { tokenVerify } from "./jwtToken.js";
import bcrypt from "bcryptjs";

const resetPassword = async (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ message: "Token and password are required" });
  }

  try {
    // Verify token
    const decoded = tokenVerify(token);
    
    // Handle specific failure cases
    if (!decoded) {
      return res.status(400).json({ message: "Token is invalid or has expired" });
    }
    
    if (decoded.purpose !== 'password-reset') {
      return res.status(400).json({ message: "Invalid token purpose: token not meant for password reset" });
    }
    
    if (!decoded.id || !decoded.role) {
      return res.status(400).json({ message: "Invalid token format: missing user information" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update user record based on role
    if (decoded.role === 'patient') {
      await prisma.Patient.update({
        where: { id: parseInt(decoded.id) },
        data: { password: hashedPassword }
      });
    } else if (decoded.role === 'doctor') {
      await prisma.Doctor.update({
        where: { id: decoded.id },
        data: { password: hashedPassword }
      });
    } else {
      return res.status(400).json({ message: "Invalid user role in token" });
    }

    return res.status(200).json({ 
      message: "Password reset successfully",
      status: 'success'
    });
  } catch (err) {
    console.error('Error resetting password:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: "Invalid token format" });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: "Token has expired, please request a new password reset" });
    }
    return res.status(500).json({ message: "Error resetting password" });
  }
};

export default resetPassword; 