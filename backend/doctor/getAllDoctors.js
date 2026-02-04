import prisma from "../client.js"

const getAllDoctors = async (req, res) => {
    try {
        const doctors = await prisma.Patient.findMany({
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
        
        res.status(200).json(doctors);
    } catch (err) {
        console.error('Error in retrieving doctors:', err);
        res.status(500).send('Error in retrieving doctors');
    }
};

export default getAllDoctors;