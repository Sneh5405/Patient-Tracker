import prisma from "../client.js";
import { tokenVerify } from "../auth/jwtToken.js";

const deletePrescription = async (req, res) => {
  try {
    const token = req.headers.authorization?.split(" ")[1];

    if (!token) {
      return res.status(401).json({ message: "Authentication required" });
    }

    const decoded = tokenVerify(token);
    if (!decoded || decoded.role !== 'doctor') {
      return res.status(403).json({ message: "Unauthorized: Only doctors can delete prescriptions" });
    }

    const { prescriptionId } = req.params;

    if (!prescriptionId) {
      return res.status(400).json({ message: "Prescription ID is required" });
    }

    const result = await prisma.$transaction(async (tx) => {
      const prescription = await tx.Prescription.findUnique({
        where: { id: prescriptionId },
        select: { doctorId: true, patientId: true }
      });

      if (!prescription) {
        throw new Error("Prescription not found");
      }

      // Optional: Check if the doctor deleting is the one who created it
      // if (prescription.doctorId !== decoded.id) {
      //   throw new Error("Forbidden: You can only delete your own prescriptions");
      // }

      // Delete adherence records
      await tx.MedicineAdherence.deleteMany({
        where: {
          prescriptionId: prescriptionId,
        },
      });

      // Delete PrescribedMedicine records
      await tx.PrescribedMedicine.deleteMany({
        where: { prescriptionId: prescriptionId },
      });

      // Delete the Prescription record
      await tx.Prescription.delete({
        where: { id: prescriptionId },
      });

      return { success: true };
    });

    if (result.success) {
      return res.status(200).json({ message: "Prescription and associated records deleted successfully" });
    }

  } catch (err) {
    console.error('Error deleting prescription:', err);
    if (err.message.includes("not found")) {
        return res.status(404).json({ message: "Prescription not found" });
    }
    if (err.message.includes("Forbidden")) {
        return res.status(403).json({ message: err.message });
    }
    return res.status(500).json({ message: "Error deleting prescription: " + err.message });
  }
};

export default deletePrescription; 