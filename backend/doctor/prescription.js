import prisma from "../client.js";
import { tokenVerify } from "../auth/jwtToken.js";

const prescription = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const decoded = tokenVerify(token);
    if (!decoded || decoded.role !== 'doctor') {
      return res.status(403).json({ message: "Unauthorized: Only doctors can create prescriptions" });
    }
    
    const { patientId, medicines, condition } = req.body;
    
    console.log("Received patientId:", patientId);
    
    // Enhanced validation for request data
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }
    
    if (!medicines || !Array.isArray(medicines) || medicines.length === 0) {
      return res.status(400).json({ message: "At least one medicine is required" });
    }
    
    // Validate each medicine has required fields
    const isValid = medicines.every(med => 
      med.id && med.name && med.dosage && med.timing && med.instructions && med.duration
    );
    
    if (!isValid) {
      return res.status(400).json({ message: "All medicines must have id, name, dosage, timing, instructions and duration" });
    }

    // Convert patientId to integer if it's not already
    const patientIdInt = parseInt(patientId, 10);
    
    if (isNaN(patientIdInt)) {
      return res.status(400).json({ message: "Invalid patient ID format" });
    }

    // Check if patient exists
    const patient = await prisma.Patient.findUnique({
      where: { id: patientIdInt }
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Create prescription with proper data formatting
    const prescription = await prisma.Prescription.create({
      data: {
        patientId: patientIdInt,
        doctorId: decoded.id,
        date: new Date(),
        condition: condition || "General",
        medicines: {
          create: medicines.map(med => ({
            medicineId: med.id.toString(),
            medicineName: med.name,
            dosage: med.dosage.toString(),
            timing: med.timing,
            instructions: med.instructions,
            duration: med.duration
          }))
        }
      },
      include: {
        medicines: true,
        patient: {
          select: {
            name: true,
            email: true
          }
        },
        doctor: {
          select: {
            name: true
          }
        }
      }
    });

    return res.status(201).json({
      message: "Prescription created successfully",
      prescription
    });
  } catch (err) {
    console.error('Error creating prescription:', err);
    return res.status(500).json({ message: "Error creating prescription: " + err.message });
  }
};

export default prescription;
