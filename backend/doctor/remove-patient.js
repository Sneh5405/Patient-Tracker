import { tokenVerify } from "../auth/jwtToken.js";
import prisma from "../client.js";

const removePatient = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const doctorData = tokenVerify(token);
        
        if (!doctorData || doctorData.role !== 'doctor') {
            return res.status(403).json({ message: "Unauthorized: Only doctors can remove patients" });
        }
        
        const doctorId = doctorData.id;
        const patientIdentifier = req.body.patientId;
        
        if (!patientIdentifier) {
            return res.status(400).json({ message: "Patient identifier is required" });
        }

        let patientId;
        
        // Check if patientIdentifier is an integer or a string
        if (!isNaN(parseInt(patientIdentifier))) {
            // If it's a valid number, use it directly
            patientId = parseInt(patientIdentifier);
        } else {
            // If it's a string (like email or "name (email)"), try to extract email
            let email;
            
            if (patientIdentifier.includes('@')) {
                // Extract email from string like "name (email@example.com)"
                const match = patientIdentifier.match(/\(([^)]+)\)/);
                if (match && match[1].includes('@')) {
                    email = match[1].trim();
                } else if (patientIdentifier.includes('@')) {
                    // It might be just the email
                    email = patientIdentifier.trim();
                }
            }
            
            if (!email) {
                return res.status(400).json({ message: "Invalid patient identifier. Please provide a valid patient ID or email." });
            }
            
            // Find patient by email
            const patient = await prisma.Patient.findUnique({
                where: { email }
            });
            
            if (!patient) {
                return res.status(404).json({ message: `Patient with email ${email} not found` });
            }
            
            patientId = patient.id;
        }
        
        // Check if the patient is assigned to this doctor
        const doctor = await prisma.Doctor.findUnique({
            where: { id: doctorId },
            include: {
                patients: {
                    where: { id: patientId }
                }
            }
        });
        
        if (!doctor || doctor.patients.length === 0) {
            return res.status(404).json({ message: "This patient is not assigned to you or doesn't exist" });
        }
        
        // Remove the association between doctor and patient
        const updatedDoctor = await prisma.Doctor.update({
            where: { id: doctorId },
            data: {
                patients: {
                    disconnect: { id: patientId }
                }
            },
            include: {
                patients: true
            }
        });
        
        return res.status(200).json({
            message: "Patient removed successfully",
            patientsCount: updatedDoctor.patients.length
        });
    } catch(err) {
        console.error('Error in removing patient:', err);
        return res.status(500).json({ message: 'Error in removing patient', error: err.message });
    }
};

export default removePatient; 