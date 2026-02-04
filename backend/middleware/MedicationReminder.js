import { sendReminders } from "../scheduleTasks.js";

// Track last reminder time for each time of day
const lastReminderSent = {
  morning: null,
  afternoon: null,
  evening: null,
};

// Cooldown period in milliseconds (4 minutes = 240000 ms)
const REMINDER_COOLDOWN = 240000;

// Convert from middleware to utility function
export const triggerMedicationReminder = async () => {
  try {
    // Determine time of day based on current hour
    const hour = new Date().getHours();
    let timeOfDay = "morning";

    if (hour >= 12 && hour < 17) {
      timeOfDay = "afternoon";
    } else if (hour >= 17) {
      timeOfDay = "evening";
    }

    const now = Date.now();

    // Check if we've sent a reminder for this time period recently
    if (
      lastReminderSent[timeOfDay] &&
      now - lastReminderSent[timeOfDay] < REMINDER_COOLDOWN
    ) {
      // Skip sending reminder if we sent one recently
      return false;
    }

    // Update the last reminder time before sending
    lastReminderSent[timeOfDay] = now;

    // Trigger reminders asynchronously without affecting response time
    sendReminders(timeOfDay).catch((error) =>
      console.error(`Error sending ${timeOfDay} medication reminders:`, error)
    );

    return true;
  } catch (error) {
    console.error("Error in medication reminder:", error);
    return false;
  }
};

// Keep the middleware version for backward compatibility
export default function medicationReminder(req, res, next) {
  // Run the reminder function asynchronously without blocking the request
  triggerMedicationReminder().catch(console.error);
  next();
}
