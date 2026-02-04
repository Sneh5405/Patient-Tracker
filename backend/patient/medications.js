import prisma from "../client.js";
import { tokenVerify } from "../auth/jwtToken.js";
import jwt from "jsonwebtoken";

// Get today's medications for a patient
export const getTodayMedications = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = tokenVerify(token);
    if (!decoded || decoded.role !== "patient") {
      return res
        .status(403)
        .json({ message: "Unauthorized: Only patients can view medications" });
    }

    const { patientId } = req.params;

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    // Get current date in YYYY-MM-DD format
    const today = new Date().toISOString().split("T")[0];

    // Get medications for today - use createdAt instead of scheduledDate if schema not updated
    try {
      const medications = await prisma.MedicineAdherence.findMany({
        where: {
          patientId: parseInt(patientId, 10), // Ensure it's an integer
          scheduledDate: today,
        },
        orderBy: {
          createdAt: "asc",
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
            patientId: parseInt(patientId, 10), // Ensure it's an integer
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
              for (const timeOfDay of ["morning", "afternoon", "evening"]) {
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
                    adherenceStatus: "Pending",
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
        "Database query error, trying alternative query method:",
        prismaError.message
      );

      // Fallback: Query without scheduledDate if not available in schema
      const medications = await prisma.MedicineAdherence.findMany({
        where: {
          patientId: parseInt(patientId, 10), // Ensure it's an integer
          createdAt: {
            gte: new Date(today),
            lt: new Date(
              new Date(today).setDate(new Date(today).getDate() + 1)
            ),
          },
        },
        orderBy: {
          createdAt: "asc",
        },
      });

      if (medications.length > 0) {
        return res.status(200).json(medications);
      }
    }

    // If no specific medications found for today, get from prescriptions
    const prescriptions = await prisma.Prescription.findMany({
      where: {
        patientId: parseInt(patientId, 10), // Ensure it's an integer
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
              scheduledTime: "morning",
              adherenceStatus: "Pending",
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
              scheduledTime: "afternoon",
              adherenceStatus: "Pending",
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
              scheduledTime: "evening",
              adherenceStatus: "Pending",
              prescriptionId: prescription.id,
            });
            addedMedicines.add(`${medicine.id}-evening`);
          }
        }
      }
    }

    return res.status(200).json(currentMedications);
  } catch (err) {
    console.error("Error fetching medications:", err);
    return res
      .status(500)
      .json({ message: "Error fetching medications: " + err.message });
  }
};

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

// Update a specific medication's status (Taken/Missed)
export const updateMedicationStatus = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Authorization token required' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const { id, status, patientId, medication, prescriptionId, medicineId, scheduledTime, isNewMedication } = req.body;

    // Verify the token belongs to the patient or a doctor
    const isAuthorized = decoded.role === 'patient' && decoded.id == patientId || decoded.role === 'doctor';
    if (!isAuthorized) {
      return res.status(403).json({ message: 'Unauthorized: Only patients can update their own medications' });
    }

    const today = new Date().toISOString().split('T')[0];

    // First, check if a record already exists for this medication on this date and time period
    const existingRecord = await prisma.MedicineAdherence.findFirst({
      where: {
        patientId: parseInt(patientId),
        scheduledDate: today,
        scheduledTime: scheduledTime,
        medicineId: medicineId,
      }
    });

    let result;
    
    if (existingRecord) {
      // Update existing record instead of creating a new one
      console.log(`Updating existing record for medicine: ${medication}, medicineId: ${medicineId}`);
      
      result = await prisma.MedicineAdherence.update({
        where: {
          id: existingRecord.id
        },
        data: {
          adherenceStatus: status,
          updatedAt: new Date()
        }
      });
    } else if (isNewMedication || !medicineId) {
      // Only create a new record if it's a new medication or doesn't have a medicine ID
      console.log(`Creating new adherence record for medicine: ${medication}`);
      
      result = await prisma.MedicineAdherence.create({
        data: {
          patientId: parseInt(patientId),
          medication: medication,
          scheduledDate: today,
          scheduledTime: scheduledTime,
          adherenceStatus: status,
          prescriptionId: prescriptionId,
          medicineId: medicineId
        }
      });
    } else {
      // Fallback for other cases - but this should rarely happen
      return res.status(400).json({ message: 'Unable to determine if medication record should be created or updated' });
    }

    res.json(result);
  } catch (error) {
    console.error('Error updating medication status:', error);
    res.status(500).json({ message: 'Failed to update medication status' });
  }
};

// Get medication history for a patient
export const getMedicationHistory = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = tokenVerify(token);
    if (!decoded || decoded.role !== "patient") {
      return res.status(403).json({
        message: "Unauthorized: Only patients can view medication history",
      });
    }

    const { patientId } = req.params;
    const { days = 7 } = req.query; // Default to 7 days of history

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    const history = await prisma.MedicineAdherence.findMany({
      where: {
        patientId: parseInt(patientId, 10), // Ensure it's an integer
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.status(200).json(history);
  } catch (err) {
    console.error("Error fetching medication history:", err);
    return res
      .status(500)
      .json({ message: "Error fetching medication history: " + err.message });
  }
};

// Get medication adherence statistics
export const getMedicationAdherenceStats = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = tokenVerify(token);

    const { patientId } = req.params;
    const { days = 30 } = req.query; // Default to 30 days of stats

    if (!patientId) {
      return res.status(400).json({ message: "Patient ID is required" });
    }

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Get all medication records in the date range
    const adherenceRecords = await prisma.MedicineAdherence.findMany({
      where: {
        patientId: parseInt(patientId, 10), // Ensure it's an integer
        createdAt: {
          gte: startDate,
          lte: endDate,
        },
      },
    });

    // Get today's prescriptions to count unique medicines
    const today = new Date().toISOString().split("T")[0];
    const prescriptions = await prisma.Prescription.findMany({
      where: {
        patientId: parseInt(patientId, 10),
      },
      include: {
        medicines: true,
      },
    });

    // Extract unique medicines from prescriptions
    const uniqueMedicines = new Set();
    prescriptions.forEach(prescription => {
      prescription.medicines.forEach(medicine => {
        uniqueMedicines.add(medicine.id);
      });
    });

    // Count only non-pending records for adherence calculation
    const totalActiveCount = adherenceRecords.filter(
      r => r.adherenceStatus !== "Pending"
    ).length;
    
    const takenCount = adherenceRecords.filter(
      r => r.adherenceStatus === "Taken"
    ).length;
    
    const missedCount = adherenceRecords.filter(
      r => r.adherenceStatus === "Missed"
    ).length;
    
    const pendingCount = adherenceRecords.filter(
      r => r.adherenceStatus === "Pending"
    ).length;

    // Calculate adherence rate (taken / (taken + missed)) excluding pending
    const adherenceRate = totalActiveCount > 0 
      ? (takenCount / totalActiveCount) * 100 
      : 0;

    // Group by date to see daily adherence
    const dailyAdherence = {};
    adherenceRecords.forEach((record) => {
      const date = new Date(record.createdAt).toISOString().split("T")[0];
      if (!dailyAdherence[date]) {
        dailyAdherence[date] = { total: 0, taken: 0, missed: 0, pending: 0 };
      }

      dailyAdherence[date].total++;
      if (record.adherenceStatus === "Taken") {
        dailyAdherence[date].taken++;
      } else if (record.adherenceStatus === "Missed") {
        dailyAdherence[date].missed++;
      } else {
        dailyAdherence[date].pending++;
      }
    });

    // Convert to array for easier frontend processing
    const dailyStats = Object.keys(dailyAdherence).map((date) => {
      const activeTotal = dailyAdherence[date].taken + dailyAdherence[date].missed;
      return {
        date,
        ...dailyAdherence[date],
        adherenceRate: activeTotal > 0
          ? (dailyAdherence[date].taken / activeTotal) * 100
          : 0
      };
    });

    const stats = {
      summary: {
        totalMedications: uniqueMedicines.size, // Number of unique medicines
        takenCount,
        missedCount,
        pendingCount,
        adherenceRate: parseFloat(adherenceRate.toFixed(2)),
      },
      dailyStats,
    };

    return res.status(200).json(stats);
  } catch (err) {
    console.error("Error fetching medication adherence stats:", err);
    return res
      .status(500)
      .json({ message: "Error fetching adherence stats: " + err.message });
  }
};
