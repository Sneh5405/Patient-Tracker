import cron from "node-cron";
import prisma from "./client.js";
import { emailServiceAlert } from "./utils/emailServiceAlert.js";
import jwt from "jsonwebtoken";
import dotenv from "dotenv";

dotenv.config();

// Schedule morning medication reminders (8:00 AM)
cron.schedule("0 8 * * *", async () => {
  console.log("Running morning medication reminders...");
  await sendReminders("morning");
});

// Schedule afternoon medication reminders (1:00 PM)
cron.schedule("0 13 * * *", async () => {
  console.log("Running afternoon medication reminders...");
  await sendReminders("afternoon");
});

// Schedule evening medication reminders (8:00 PM)
cron.schedule("0 20 * * *", async () => {
  console.log("Running evening medication reminders...");
  await sendReminders("evening");
});

// Continuous monitoring: Check every minute for missed medications
cron.schedule("* * * * *", async () => {
  await continuouslyCheckMissedMedications();
});

// Run less frequent but more thorough checks at transition periods
// Check at 12:30 PM (for missed morning medications)
cron.schedule("30 12 * * *", async () => {
  console.log("Checking for missed morning medications...");
  await checkForMissedMedications("morning");
});

// Check at 6:30 PM (for missed afternoon medications)
cron.schedule("30 18 * * *", async () => {
  console.log("Checking for missed afternoon medications...");
  await checkForMissedMedications("afternoon");
});

// Check at 10:00 PM (for missed evening medications)
cron.schedule("0 22 * * *", async () => {
  console.log("Checking for missed evening medications...");
  await checkForMissedMedications("evening");
});

// Continuous monitoring function that runs every minute
async function continuouslyCheckMissedMedications() {
  try {
    const today = new Date().toISOString().split("T")[0];
    const currentHour = new Date().getHours();
    const currentMinute = new Date().getMinutes();
    
    // Only log on the hour to avoid excessive logging
    if (currentMinute === 0) {
      console.log(`Continuous medication check at ${currentHour}:00`);
    }
    
    // Define transition hours for time periods
    const morningEndHour = 12;    // 12:00 PM - end of morning period
    const afternoonEndHour = 18;  // 6:00 PM - end of afternoon period
    const eveningEndHour = 22;    // 10:00 PM - end of evening period
    
    let timePeriodsToCheck = [];
    
    // Determine which time periods should be checked based on current hour
    if (currentHour >= morningEndHour && currentHour < afternoonEndHour) {
      // It's afternoon, check for missed morning medications
      timePeriodsToCheck.push("morning");
    } else if (currentHour >= afternoonEndHour && currentHour < eveningEndHour) {
      // It's evening, check for missed morning and afternoon medications
      timePeriodsToCheck.push("morning", "afternoon");
    } else if (currentHour >= eveningEndHour || currentHour < 5) {
      // It's night, check for all missed medications
      timePeriodsToCheck.push("morning", "afternoon", "evening");
    }
    
    // Only query if there are time periods to check
    if (timePeriodsToCheck.length > 0) {
      // Minutes after transition to check (avoids immediate marking at the top of the hour)
      const transitionMinutes = 5;
      
      // At specific transition points, perform checks
      const isTransitionPoint = 
        (currentHour === morningEndHour && currentMinute === transitionMinutes) ||
        (currentHour === afternoonEndHour && currentMinute === transitionMinutes) ||
        (currentHour === eveningEndHour && currentMinute === transitionMinutes);
      
      // Perform check at transition points or every 15 minutes
      if (isTransitionPoint || currentMinute % 15 === 0) {
        // Find all pending medications for the specified time periods
        const pendingMedications = await prisma.MedicineAdherence.findMany({
          where: {
            scheduledDate: today,
            adherenceStatus: "Pending",
            scheduledTime: {
              in: timePeriodsToCheck
            }
          },
          include: {
            patient: true  // Include patient info to send notifications
          }
        });
        
        // Count by time period for logging
        const countByPeriod = {};
        timePeriodsToCheck.forEach(period => {
          countByPeriod[period] = pendingMedications.filter(med => med.scheduledTime === period).length;
        });
        
        // Only log if we found medications to mark
        if (pendingMedications.length > 0) {
          console.log(`Found ${pendingMedications.length} pending medications to mark as missed:`, countByPeriod);
          
          // Group medications by patient for better notification
          const medicationsByPatient = {};
          
          // Mark each medication as missed
          for (const med of pendingMedications) {
            await prisma.MedicineAdherence.update({
              where: { id: med.id },
              data: {
                adherenceStatus: "Missed",
                missedDoses: {
                  increment: 1
                }
              }
            });
            
            // Group by patient for notifications
            if (!medicationsByPatient[med.patientId]) {
              medicationsByPatient[med.patientId] = {
                count: 0,
                patient: med.patient
              };
            }
            medicationsByPatient[med.patientId].count++;
          }
          
          // Send WebSocket notifications to each affected patient
          if (global.io) {
            for (const patientId in medicationsByPatient) {
              const data = medicationsByPatient[patientId];
              
              // Emit event for this specific patient
              global.io.emit('medications-updated', {
                patientId: parseInt(patientId),
                count: data.count,
                message: `${data.count} medication(s) automatically marked as missed`
              });
              
              console.log(`Sent WebSocket notification to patient ${patientId} about ${data.count} missed medications`);
            }
          }
          
          console.log(`Successfully marked ${pendingMedications.length} medications as missed`);
        }
      }
    }
  } catch (error) {
    console.error("Error in continuous medication check:", error);
  }
}

// Add a check to avoid sending reminders for medications that are already taken
export async function sendReminders(timeOfDay) {
  try {
    // Get all patients with active prescriptions
    const patients = await prisma.Patient.findMany({
      where: {
        prescriptions: {
          some: {}, // Has at least one prescription
        },
      },
    });

    let remindersSent = 0;

    for (const patient of patients) {
      // Check if the patient has medications scheduled for this time of day
      const prescriptions = await prisma.Prescription.findMany({
        where: { patientId: patient.id },
        include: { medicines: true },
      });

      // Get today's date in YYYY-MM-DD format for checking adherence records
      const today = new Date().toISOString().split("T")[0];

      // Check existing adherence records to see if medications are already taken
      const existingAdherenceRecords = await prisma.MedicineAdherence.findMany({
        where: {
          patientId: patient.id,
          scheduledTime: timeOfDay,
          scheduledDate: today,
        },
      });

      // Create a map for quick lookup of medication adherence status
      const medicationStatusMap = {};
      existingAdherenceRecords.forEach(record => {
        medicationStatusMap[record.medicineId] = record.adherenceStatus;
      });
      
      // Check if there are any untaken medications for this time period
      const hasMedicationsForTimeOfDay = prescriptions.some((prescription) =>
        prescription.medicines.some(
          (med) => {
            const isMedForThisTimePeriod = med.timing && med.timing[timeOfDay] === true;
            const isMedAlreadyTaken = medicationStatusMap[med.id] === "Taken";
            
            return isMedForThisTimePeriod && !isMedAlreadyTaken;
          }
        )
      );

      if (hasMedicationsForTimeOfDay) {
        // Generate a token for the patient
        const token = jwt.sign(
          { id: patient.id, role: "patient" },
          process.env.JWT_SECRET,
          { expiresIn: "24h" }
        );

        // Add logic to check if medication is already taken before sending reminder
        const medicationsToRemind = prescriptions.flatMap((prescription) =>
          prescription.medicines.filter(
            (med) => {
              const isMedForThisTimePeriod = med.timing && med.timing[timeOfDay] === true;
              const isMedAlreadyTaken = medicationStatusMap[med.id] === "Taken";
              
              return isMedForThisTimePeriod && !isMedAlreadyTaken;
            }
          )
        );

        // Send reminder
        if (medicationsToRemind.length > 0) {
          const sent = await emailServiceAlert(token);
          if (sent) remindersSent++;
        }
      }
    }

    console.log(`Sent ${timeOfDay} reminders to ${remindersSent} patients`);
    return remindersSent;
  } catch (error) {
    console.error(`Error sending ${timeOfDay} reminders:`, error);
    throw error;
  }
}

// Enhanced function to check for missed medications for a specific time period
async function checkForMissedMedications(timeOfDay) {
  try {
    const today = new Date().toISOString().split("T")[0];

    // Find medications that are still pending for today for the specific time period
    const pendingMedications = await prisma.MedicineAdherence.findMany({
      where: {
        scheduledDate: today,
        adherenceStatus: "Pending",
        scheduledTime: timeOfDay
      },
      include: {
        patient: true,
      },
    });

    console.log(`Found ${pendingMedications.length} pending ${timeOfDay} medications`);

    // For each pending medication of this time period, mark as missed
    for (const med of pendingMedications) {
      await prisma.MedicineAdherence.update({
        where: { id: med.id },
        data: {
          adherenceStatus: "Missed",
          missedDoses: {
            increment: 1,
          },
        },
      });
      
      console.log(`Marked medication ID ${med.id} as missed for patient ${med.patientId}`);
    }

    // If there's no specific time period given, check all time periods based on current time
    if (!timeOfDay) {
      const timeNow = new Date().getHours();
      const pendingAllMedications = await prisma.MedicineAdherence.findMany({
        where: {
          scheduledDate: today,
          adherenceStatus: "Pending",
        },
        include: {
          patient: true,
        },
      });

      // Group by patient
      const patientGroups = pendingAllMedications.reduce((groups, med) => {
        if (!groups[med.patientId]) {
          groups[med.patientId] = {
            patient: med.patient,
            medications: [],
          };
        }
        groups[med.patientId].medications.push(med);
        return groups;
      }, {});

      // Update medications to "Missed" if they are older reminders
      for (const patientId in patientGroups) {
        const { patient, medications } = patientGroups[patientId];

        // Update medications to "Missed" based on current time
        for (const med of medications) {
          let shouldMarkMissed = false;

          switch (med.scheduledTime) {
            case "morning":
              shouldMarkMissed = timeNow >= 12;
              break;
            case "afternoon":
              shouldMarkMissed = timeNow >= 18;
              break;
            case "evening":
              shouldMarkMissed = timeNow >= 22;
              break;
          }

          if (shouldMarkMissed) {
            await prisma.MedicineAdherence.update({
              where: { id: med.id },
              data: {
                adherenceStatus: "Missed",
                missedDoses: {
                  increment: 1,
                },
              },
            });
            console.log(`Marked medication ID ${med.id} as missed for patient ${med.patientId}`);
          }
        }
      }
    }

    console.log(`Completed missed medication check for ${timeOfDay || 'all time periods'}`);
  } catch (error) {
    console.error("Error checking for missed medications:", error);
  }
}

export const initScheduler = () => {
  console.log("Medication reminder scheduler initialized");
  
  // Run an immediate check when the server starts
  setTimeout(() => {
    console.log('Running initial missed medication check...');
    continuouslyCheckMissedMedications();
  }, 5000); // Wait 5 seconds after server start
};
