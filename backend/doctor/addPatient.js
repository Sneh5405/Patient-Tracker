import prisma from "../client.js";
import { tokenGenerate, tokenVerify } from "../auth/jwtToken.js";
import { sendInviteEmail } from "../utils/emailService.js";

const addPatient = async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) {
    return res.status(401).json({ message: "Authentication required" });
  }

  const decoded = tokenVerify(token);
  if (!decoded || decoded.role !== 'doctor') {
    return res.status(403).json({ message: "Unauthorized: Only doctors can add patients" });
  }

  const { name, email, age, gender } = req.body;
  
  try {
    // Check if email already exists
    const existingPatient = await prisma.Patient.findUnique({
      where: { email }
    });

    if (existingPatient) {
      return res.status(400).json({ message: "Patient with this email already exists" });
    }

    // Create patient without password (pending status)
    const newPatient = await prisma.Patient.create({
      data: {
        name,
        email,
        age: age ? parseInt(age) : null,
        gender,
        status: 'pending',
        doctors: {
          connect: { id: decoded.id }
        }
      }
    });

    // Generate token for password setup
    const inviteToken = tokenGenerate({
      email,
      purpose: 'password-setup',
      patientId: newPatient.id
    });

    // Send invitation email
    const emailSent = await sendInviteEmail(email, name, inviteToken);

    return res.status(201).json({ 
      message: "Patient added successfully", 
      patient: newPatient,
      emailSent
    });
  } catch (err) {
    console.error('Error adding patient:', err);
    return res.status(500).json({ message: "Error adding patient" });
  }
};

export default addPatient;
