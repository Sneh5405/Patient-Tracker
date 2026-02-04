/*
  Warnings:

  - Added the required column `updatedAt` to the `MedicineAdherence` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "MedicineAdherence" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "medicineId" TEXT,
ADD COLUMN     "prescriptionId" TEXT,
ADD COLUMN     "scheduledDate" TEXT,
ADD COLUMN     "scheduledTime" TEXT,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;
