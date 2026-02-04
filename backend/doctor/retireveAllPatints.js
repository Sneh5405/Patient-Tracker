import prisma from "../client.js"

const retrieveAllPatients = async (req, res) => {
    try {
        const patients = await prisma.Patient.findMany({
            include: {
                doctors: {
                    select: {
                        id: true,
                        name: true,
                        specialization: true,
                        email: true
                    }
                }
            }
        });
        
        res.status(200).json(patients);
    } catch (err) {
        console.error('Error in retrieving patients:', err);
        res.status(500).send('Error in retrieving patients');
    }
};

export default retrieveAllPatients;