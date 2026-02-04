import prisma from "../client.js";
import { tokenVerify } from "../auth/jwtToken.js";

const getPatientAppointments = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const patient = tokenVerify(token);
    
    if (patient.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can access this endpoint' });
    }
    
    // Ensure patientId is an integer
    const patientId = parseInt(patient.id, 10);
    
    const { status } = req.query;
    
    // Build where clause based on filters
    const whereClause = { patientId };
    
    if (status) {
      whereClause.status = status;
    }
    
    const appointments = await prisma.Appointment.findMany({
      where: whereClause,
      include: {
        doctor: {
          select: {
            id: true,
            name: true,
            email: true,
            specialization: true
          }
        }
      },
      orderBy: {
        appointmentDate: 'asc'
      }
    });
    
    res.status(200).json(appointments);
  } catch (error) {
    console.error('Error fetching patient appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export default getPatientAppointments; 