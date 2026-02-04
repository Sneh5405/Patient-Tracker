import prisma from "../client.js";
import { tokenVerify } from "./jwtToken.js";
import bcrypt from "bcryptjs";

const setPassword = async (req, res) => {
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
    
    if (!decoded.purpose) {
      return res.status(400).json({ message: "Invalid token format: missing purpose field" });
    }
    
    if (decoded.purpose !== 'password-setup') {
      return res.status(400).json({ message: "Invalid token purpose: token not meant for password setup" });
    }
    
    if (!decoded.patientId) {
      return res.status(400).json({ message: "Invalid token format: missing patient ID" });
    }

    // Check if patient exists
    const patientExists = await prisma.Patient.findUnique({
      where: { id: decoded.patientId },
    });
    
    if (!patientExists) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Update patient record
    const patient = await prisma.Patient.update({
      where: { id: decoded.patientId },
      data: {
        password: hashedPassword,
        status: 'active'
      }
    });

    return res.status(200).json({ 
      message: "Password set successfully",
      status: 'success'
    });
  } catch (err) {
    console.error('Error setting password:', err);
    if (err.name === 'JsonWebTokenError') {
      return res.status(400).json({ message: "Invalid token format" });
    } else if (err.name === 'TokenExpiredError') {
      return res.status(400).json({ message: "Token has expired, please request a new invitation" });
    }
    return res.status(500).json({ message: "Error setting password" });
  }
};

export default setPassword;
