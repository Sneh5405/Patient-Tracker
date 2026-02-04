import prisma from "../client.js";

const getAvailableSlots = async (req, res) => {
  try {
    const { doctorId, date } = req.query;
    
    if (!doctorId || !date) {
      return res.status(400).json({ error: 'Doctor ID and date are required' });
    }
    
    // Ensure doctorId is a string
    const doctorIdStr = String(doctorId);
    
    // Check if the doctor exists
    const doctor = await prisma.Doctor.findUnique({
      where: { id: doctorIdStr }
    });
    
    if (!doctor) {
      return res.status(404).json({ error: 'Doctor not found' });
    }
    
    // Convert query date to Date object
    const queryDate = new Date(date);
    const nextDay = new Date(queryDate);
    nextDay.setDate(nextDay.getDate() + 1);
    
    // Get existing appointments for the doctor on the specified date
    const existingAppointments = await prisma.Appointment.findMany({
      where: {
        doctorId: doctorIdStr,
        appointmentDate: {
          gte: queryDate,
          lt: nextDay
        },
        status: { not: 'cancelled' }
      },
      select: {
        appointmentDate: true
      }
    });
    
    // Generate all possible time slots (9 AM to 5 PM, 1-hour intervals)
    const allSlots = [];
    const slotDate = new Date(queryDate);
    slotDate.setHours(9, 0, 0, 0); // Start at 9 AM
    
    while (slotDate.getHours() < 17) { // Until 5 PM
      allSlots.push(new Date(slotDate));
      slotDate.setHours(slotDate.getHours() + 1);
    }
    
    // Filter out booked slots
    const bookedTimes = existingAppointments.map(app => app.appointmentDate.getTime());
    const availableSlots = allSlots.filter(slot => !bookedTimes.includes(slot.getTime()));
    
    res.status(200).json({
      doctorId: doctorIdStr,
      date: queryDate.toISOString().split('T')[0],
      availableSlots: availableSlots.map(slot => ({
        time: slot.toISOString(),
        formattedTime: `${slot.getHours()}:${slot.getMinutes().toString().padStart(2, '0')}`
      }))
    });
  } catch (error) {
    console.error('Error fetching available slots:', error);
    res.status(500).json({ error: 'Failed to fetch available slots' });
  }
};

export default getAvailableSlots; 