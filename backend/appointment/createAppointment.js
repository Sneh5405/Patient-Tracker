import prisma from "../client.js";
import { tokenVerify } from "../auth/jwtToken.js";

const createAppointment = async (req, res) => {
  try {
    const token = req.headers.authorization.split(' ')[1];
    const patient = tokenVerify(token);
    
    if (patient.role !== 'patient') {
      return res.status(403).json({ error: 'Only patients can book appointments' });
    }
    
    const { doctorId, appointmentDate, purpose } = req.body;
    
    if (!doctorId || !appointmentDate) {
      return res.status(400).json({ error: 'Doctor ID and appointment date are required' });
    }
    
    // Ensure patientId is an integer and doctorId is a string
    const patientIdInt = parseInt(patient.id, 10);
    const doctorIdStr = String(doctorId);
    
    // Convert string date to Date object
    const bookingDate = new Date(appointmentDate);
    
    // Check if the doctor exists
    const doctor = await prisma.Doctor.findUnique({
      where: { id: doctorIdStr }
    });
    
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    // Check if the patient is assigned to this doctor
    const patientRecord = await prisma.Patient.findFirst({
      where: {
        id: patientIdInt,
        doctors: {
          some: {
            id: doctorIdStr
          }
        }
      }
    });
    
    if (!patientRecord) {
      return res.status(403).json({ error: 'You can only book appointments with your assigned doctors' });
    }
    
    // Check if the time slot is available (no appointments for the doctor in the same hour)
    const startTime = new Date(bookingDate);
    const endTime = new Date(bookingDate);
    endTime.setHours(endTime.getHours() + 1);
    
    const conflictingAppointment = await prisma.Appointment.findFirst({
      where: {
        doctorId: doctorIdStr,
        appointmentDate: {
          gte: startTime,
          lt: endTime
        },
        status: { not: 'cancelled' }
      }
    });
    
    if (conflictingAppointment) {
      return res.status(409).json({ error: 'This time slot is already booked' });
    }
    
    // Create the appointment
    const appointment = await prisma.Appointment.create({
      data: {
        patientId: patientIdInt,
        doctorId: doctorIdStr,
        appointmentDate: bookingDate,
        status: 'scheduled',
        purpose: purpose || 'General checkup'
      }
    });
    
    res.status(201).json(appointment);
  } catch (error) {
    console.error('Error creating appointment:', error);
    res.status(500).json({ error: 'Failed to create appointment' });
  }
};

export default createAppointment; 