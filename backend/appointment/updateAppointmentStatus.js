import prisma from "../client.js";
import { tokenVerify } from "../auth/jwtToken.js";

const updateAppointmentStatus = async (req, res) => {
  try {
    console.log('Received update appointment status request:', req.body);
    
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ error: 'Authorization token is required' });
    }
    
    const user = tokenVerify(token);
    if (!user) {
      return res.status(401).json({ error: 'Invalid token' });
    }
    
    console.log('User from token:', { id: user.id, role: user.role });
    
    const { appointmentId, status } = req.body;
    
    if (!appointmentId || !status) {
      return res.status(400).json({ error: 'Appointment ID and status are required' });
    }
    
    // Validate status value
    const validStatuses = ['scheduled', 'completed', 'cancelled', 'missed'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be one of: scheduled, completed, cancelled, missed' });
    }
    
    // Ensure appointmentId is a string
    const appointmentIdStr = String(appointmentId);
    console.log('Looking for appointment with ID:', appointmentIdStr);
    
    // Fetch the appointment
    const appointment = await prisma.Appointment.findUnique({
      where: { id: appointmentIdStr }
    });
    
    if (!appointment) {
      console.log('Appointment not found with ID:', appointmentIdStr);
      return res.status(404).json({ error: 'Appointment not found' });
    }
    
    console.log('Appointment found:', appointment);
    
    // Convert user id to appropriate type based on role
    const userId = user.role === 'doctor' ? String(user.id) : parseInt(user.id, 10);
    
    // Check permissions
    if (user.role === 'doctor' && appointment.doctorId !== String(user.id)) {
      console.log('Permission denied: Doctor ID mismatch', {
        appointmentDoctorId: appointment.doctorId,
        userDoctorId: String(user.id)
      });
      return res.status(403).json({ error: 'You can only update your own appointments' });
    }
    
    if (user.role === 'patient' && appointment.patientId !== parseInt(user.id, 10)) {
      console.log('Permission denied: Patient ID mismatch', {
        appointmentPatientId: appointment.patientId,
        userPatientId: parseInt(user.id, 10)
      });
      return res.status(403).json({ error: 'You can only update your own appointments' });
    }
    
    // Patients can only cancel appointments
    if (user.role === 'patient' && status !== 'cancelled') {
      return res.status(403).json({ error: 'Patients can only cancel appointments' });
    }
    
    console.log('Updating appointment status:', {
      id: appointmentIdStr,
      from: appointment.status,
      to: status
    });
    
    // Update the appointment
    const updatedAppointment = await prisma.Appointment.update({
      where: { id: appointmentIdStr },
      data: { status }
    });
    
    console.log('Appointment updated successfully:', updatedAppointment);
    
    res.status(200).json(updatedAppointment);
  } catch (error) {
    console.error('Error updating appointment status:', error);
    res.status(500).json({
      error: 'Failed to update appointment status',
      details: error.message,
      code: error.code
    });
  }
};

export default updateAppointmentStatus; 