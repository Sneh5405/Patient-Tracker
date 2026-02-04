import prisma from "../client.js";
import { tokenVerify } from "../auth/jwtToken.js";

const getDoctorAppointments = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const doctor = tokenVerify(token);
    
    if (doctor.role !== 'doctor') {
      return res.status(403).json({ error: 'Only doctors can access this endpoint' });
    }
    
    // Ensure doctorId is a string
    const doctorId = String(doctor.id);
    
    const { status, date } = req.query;
    
    // Build where clause based on filters
    const whereClause = { doctorId };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (date) {
      const queryDate = new Date(date);
      const nextDay = new Date(queryDate);
      nextDay.setDate(nextDay.getDate() + 1);
      
      whereClause.appointmentDate = {
        gte: queryDate,
        lt: nextDay
      };
    }
    
    const appointments = await prisma.Appointment.findMany({
      where: whereClause,
      include: {
        patient: {
          select: {
            id: true,
            name: true,
            email: true,
            age: true,
            gender: true
          }
        }
      },
      orderBy: {
        appointmentDate: 'asc'
      }
    });
    
    res.status(200).json(appointments);
  } catch (error) {
    console.error('Error fetching doctor appointments:', error);
    res.status(500).json({ error: 'Failed to fetch appointments' });
  }
};

export default getDoctorAppointments; 