/*
  Warnings:

  - You are about to drop the column `completedQuantity` on the `ProductionResponse` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `ProductionResponse` table. All the data in the column will be lost.
  - You are about to drop the column `status` on the `ProductionResponse` table. All the data in the column will be lost.
  - You are about to drop the column `submittedDate` on the `ProductionResponse` table. All the data in the column will be lost.
  - You are about to drop the column `submittedTime` on the `ProductionResponse` table. All the data in the column will be lost.
  - Added the required column `stepId` to the `ProductionResponse` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `ProductionResponse` DROP COLUMN `completedQuantity`,
    DROP COLUMN `employeeId`,
    DROP COLUMN `status`,
    DROP COLUMN `submittedDate`,
    DROP COLUMN `submittedTime`,
    ADD COLUMN `stepId` CHAR(36) NOT NULL,
    ADD COLUMN `stepstartEnd` CHAR(36) NULL,
    ADD COLUMN `stepstartTime` CHAR(36) NULL,
    ADD COLUMN `submittedDateTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
