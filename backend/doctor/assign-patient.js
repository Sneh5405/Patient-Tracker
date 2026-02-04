import { tokenVerify } from "../auth/jwtToken.js";
import prisma from "../client.js";

const assignPatient = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const doctorId = tokenVerify(token).id;
        const patientIdentifier = req.body.patientId;
        
        if (!patientIdentifier) {
            return res.status(400).json({ message: "Patient identifier is required" });
        }

        let patientId;
        
        // Check if patientIdentifier is an integer or a string (like email or name+email)
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
        
        // Now we have a numeric patientId, update the patient
        const updatedPatient = await prisma.Patient.update({
            where: {
                id: patientId
            },
            data: {
                doctors: {
                    connect: {
                        id: doctorId
                    }
                }
            }
        });
        
        return res.status(200).json({
            message: "Patient assigned successfully",
            patient: updatedPatient
        });
    } catch(err) {
        console.error('Error in assigning patient:', err);
        return res.status(500).json({ message: 'Error in assigning patient', error: err.message });
    }
}

export default assignPatient;