import { tokenVerify } from "../auth/jwtToken.js";
import prisma from "../client.js";

const retrievePatients = async (req, res) => {
    try {
        const token = req.headers.authorization.split(' ')[1];
        const doctorData = tokenVerify(token);
        
        // Ensure doctorId is treated as a string
        const doctorId = String(doctorData.id);
        
        const patient = await prisma.Patient.findMany({
            where: {
                doctors: {
                    some: {
                        id: doctorId
                    }
                }
            }
        });
        
        res.status(200).json(patient);
    } catch (err) {
        console.error('Error in retrieving patients:', err);
        res.status(500).send('Error in retrieving patients');
    }
};

export default retrievePatients;