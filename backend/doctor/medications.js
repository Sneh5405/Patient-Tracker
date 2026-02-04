import prisma from '../client.js';
import jwt from 'jsonwebtoken';

// Get today's medication adherence for a specific patient, accessible by their assigned doctor
export async function getPatientMedicationsTodayForDoctor(req, res) {
  const { patientId } = req.params;
  const token = req.headers.authorization?.split(' ')[1];

  if (!token) {
    return res.status(401).json({ message: 'Authorization token required' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const doctorId = decoded.id;

    if (decoded.role !== 'doctor') {
      return res.status(403).json({ message: 'Unauthorized: Only doctors can access this data' });
    }

    // Verify the doctor is assigned to this patient
    // Instead of using a specific DoctorPatient model, check through the Doctor's patients
    const doctor = await prisma.Doctor.findUnique({
      where: { id: doctorId },
      include: {
        patients: {
          where: { id: parseInt(patientId) }
        }
      }
    });

    // If the doctor doesn't exist or the patient isn't in the doctor's patient list
    if (!doctor || doctor.patients.length === 0) {
      return res.status(403).json({ message: 'Unauthorized: Doctor is not assigned to this patient' });
    }

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split('T')[0];

    // Get medications for today - use createdAt instead of scheduledDate if schema not updated
    try {
      const medications = await prisma.MedicineAdherence.findMany({
        where: {
          patientId: parseInt(patientId),
          scheduledDate: today,
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (medications.length > 0) {
        // Get unique times from existing medications to ensure we show all time periods
        const existingTimes = [
          ...new Set(medications.map((med) => med.scheduledTime)),
        ];

        // Track medicines that already have entries for each time period
        const existingMedicineTimeMap = {};
        medications.forEach((med) => {
          if (!existingMedicineTimeMap[med.medicineId]) {
            existingMedicineTimeMap[med.medicineId] = new Set();
          }
          existingMedicineTimeMap[med.medicineId].add(med.scheduledTime);
        });

        // Get prescriptions to extract any time periods that might be missing
        const prescriptions = await prisma.Prescription.findMany({
          where: {
            patientId: parseInt(patientId),
          },
          include: {
            medicines: true,
          },
        });

        // Check if all time periods from prescriptions exist in our medications
        // If not, generate medications for those missing periods
        // Also check for duration to ensure we only show active medications
        const additionalMeds = [];
        for (const prescription of prescriptions) {
          for (const medicine of prescription.medicines) {
            const timing = medicine.timing;
            
            // Check if medication is still active based on duration
            // If prescription has a date and duration, check if it's still valid
            if (isStillActive(prescription.date, medicine.duration)) {
              // Check each time period
              for (const timeOfDay of ['morning', 'afternoon', 'evening']) {
                // Only add if:
                // 1. This time of day is required in the prescription
                // 2. This specific medicine doesn't already have an entry for this time period
                if (
                  timing[timeOfDay] &&
                  (!existingMedicineTimeMap[medicine.id] ||
                    !existingMedicineTimeMap[medicine.id].has(timeOfDay))
                ) {
                  additionalMeds.push({
                    medicineId: medicine.id,
                    medicineName: medicine.medicineName,
                    dosage: medicine.dosage,
                    instructions: medicine.instructions,
                    scheduledTime: timeOfDay,
                    adherenceStatus: 'Pending',
                    prescriptionId: prescription.id,
                  });
                }
              }
            }
          }
        }

        return res.status(200).json([...medications, ...additionalMeds]);
      }
    } catch (prismaError) {
      console.log(
        'Database query error, trying alternative query method:',
        prismaError.message
      );

      // Fallback: Query without scheduledDate if not available in schema
      const medications = await prisma.MedicineAdherence.findMany({
        where: {
          patientId: parseInt(patientId),
          createdAt: {
            gte: new Date(today),
            lt: new Date(
              new Date(today).setDate(new Date(today).getDate() + 1)
            ),
          },
        },
        orderBy: {
          createdAt: 'asc',
        },
      });

      if (medications.length > 0) {
        return res.status(200).json(medications);
      }
    }

    // If no specific medications found for today, get from prescriptions
    const prescriptions = await prisma.Prescription.findMany({
      where: {
        patientId: parseInt(patientId),
      },
      include: {
        medicines: true,
      },
    });

    // Process prescriptions to create medication schedule
    const currentMedications = [];

    // Create a record of which medicines we've already added to avoid duplicates
    const addedMedicines = new Set();

    for (const prescription of prescriptions) {
      for (const medicine of prescription.medicines) {
        // Only include medicines that are still active based on their duration
        if (isStillActive(prescription.date, medicine.duration)) {
          // Create morning, afternoon, evening entries if specified in timing
          const timing = medicine.timing;

          // Track each medicine + time combo to avoid duplicates
          if (timing.morning && !addedMedicines.has(`${medicine.id}-morning`)) {
            currentMedications.push({
              medicineId: medicine.id,
              medicineName: medicine.medicineName,
              dosage: medicine.dosage,
              instructions: medicine.instructions,
              scheduledTime: 'morning',
              adherenceStatus: 'Pending',
              prescriptionId: prescription.id,
            });
            addedMedicines.add(`${medicine.id}-morning`);
          }

          if (
            timing.afternoon &&
            !addedMedicines.has(`${medicine.id}-afternoon`)
          ) {
            currentMedications.push({
              medicineId: medicine.id,
              medicineName: medicine.medicineName,
              dosage: medicine.dosage,
              instructions: medicine.instructions,
              scheduledTime: 'afternoon',
              adherenceStatus: 'Pending',
              prescriptionId: prescription.id,
            });
            addedMedicines.add(`${medicine.id}-afternoon`);
          }

          if (timing.evening && !addedMedicines.has(`${medicine.id}-evening`)) {
            currentMedications.push({
              medicineId: medicine.id,
              medicineName: medicine.medicineName,
              dosage: medicine.dosage,
              instructions: medicine.instructions,
              scheduledTime: 'evening',
              adherenceStatus: 'Pending',
              prescriptionId: prescription.id,
            });
            addedMedicines.add(`${medicine.id}-evening`);
          }
        }
      }
    }

    return res.status(200).json(currentMedications);
  } catch (error) {
    if (error instanceof jwt.JsonWebTokenError) {
      return res.status(401).json({ message: 'Invalid token' });
    }
    console.error('Error fetching patient medication data for doctor:', error);
    res.status(500).json({ message: 'Failed to retrieve medication data' });
  }
}

// Helper function to check if a medicine is still active based on prescription date and duration
function isStillActive(prescriptionDate, durationStr) {
  if (!prescriptionDate || !durationStr) return true; // If missing data, assume it's active
  
  try {
    // Parse the duration string (e.g. "7 days", "2 weeks", "1 month")
    const durationMatch = durationStr.match(/(\d+)\s*(\w+)/);
    if (!durationMatch) return true;
    
    const value = parseInt(durationMatch[1]);
    const unit = durationMatch[2].toLowerCase();
    
    // Convert prescription date to Date object if it's not already
    const startDate = prescriptionDate instanceof Date 
      ? prescriptionDate 
      : new Date(prescriptionDate);
    
    // Calculate end date based on duration
    const endDate = new Date(startDate);
    
    if (unit.includes('day')) {
      endDate.setDate(endDate.getDate() + value);
    } else if (unit.includes('week')) {
      endDate.setDate(endDate.getDate() + (value * 7));
    } else if (unit.includes('month')) {
      endDate.setMonth(endDate.getMonth() + value);
    } else {
      return true; // Unknown unit, assume it's active
    }
    
    // Check if today is before or equal to the end date
    const today = new Date();
    return today <= endDate;
  } catch (error) {
    console.error("Error checking medication duration:", error);
    return true; // If there's an error, default to showing the medication
  }
} 