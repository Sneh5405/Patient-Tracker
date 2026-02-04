/*
  Warnings:

  - You are about to drop the column `disease` on the `Patient` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Patient" DROP COLUMN "disease";

-- AlterTable
ALTER TABLE "Prescription" ADD COLUMN     "condition" TEXT NOT NULL DEFAULT 'General';
