import prisma from "../client.js";
import { tokenVerify } from "../auth/jwtToken.js";

export const getPatientPrescriptions = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];
    
    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }
    
    const decoded = tokenVerify(token);
    if (!decoded || decoded.role !== 'patient') {
      return res.status(403).json({ message: "Unauthorized: Only patients can view prescriptions" });
    }
    
    const { patientId } = req.params;
    
    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    // Check if patient exists
    const patient = await prisma.Patient.findUnique({
      where: { id: parseInt(patientId) }
    });

    if (!patient) {
      return res.status(404).json({ message: "Patient not found" });
    }

    // Fetch prescriptions for the patient
    const prescriptions = await prisma.Prescription.findMany({
      where: { patientId: parseInt(patientId) },
      include: {
        medicines: true,
        doctor: {
          select: {
            name: true
          }
        }
      }
    });

    return res.status(200).json(prescriptions);
  } catch (err) {
    console.error('Error fetching prescriptions:', err);
    return res.status(500).json({ message: "Error fetching prescriptions: " + err.message });
  }
};
