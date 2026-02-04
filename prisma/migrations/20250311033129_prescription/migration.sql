/*
  Warnings:

  - The primary key for the `Prescription` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `dateIssued` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `id` on the `Prescription` table. All the data in the column will be lost.
  - You are about to drop the column `medications` on the `Prescription` table. All the data in the column will be lost.
  - The required column `_id` was added to the `Prescription` table with a prisma-level default value. This is not possible if the table is not empty. Please add this column as optional, then populate it before making it required.
  - Added the required column `updatedAt` to the `Prescription` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Prescription" DROP CONSTRAINT "Prescription_pkey",
DROP COLUMN "dateIssued",
DROP COLUMN "id",
DROP COLUMN "medications",
ADD COLUMN     "_id" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ADD CONSTRAINT "Prescription_pkey" PRIMARY KEY ("_id");

-- CreateTable
CREATE TABLE "PrescribedMedicine" (
    "_id" TEXT NOT NULL,
    "medicineId" TEXT NOT NULL,
    "medicineName" TEXT NOT NULL,
    "dosage" TEXT NOT NULL,
    "timing" JSONB NOT NULL,
    "instructions" TEXT NOT NULL,
    "duration" TEXT NOT NULL,
    "prescriptionId" TEXT NOT NULL,

    CONSTRAINT "PrescribedMedicine_pkey" PRIMARY KEY ("_id")
);

-- AddForeignKey
ALTER TABLE "PrescribedMedicine" ADD CONSTRAINT "PrescribedMedicine_prescriptionId_fkey" FOREIGN KEY ("prescriptionId") REFERENCES "Prescription"("_id") ON DELETE RESTRICT ON UPDATE CASCADE;
