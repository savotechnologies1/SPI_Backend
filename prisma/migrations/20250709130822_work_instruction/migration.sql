/*
  Warnings:

  - You are about to drop the column `workInstructionId` on the `InstructionImage` table. All the data in the column will be lost.
  - You are about to drop the column `workInstructionId` on the `InstructionVideo` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `InstructionImage` DROP FOREIGN KEY `InstructionImage_workInstructionId_fkey`;

-- DropForeignKey
ALTER TABLE `InstructionVideo` DROP FOREIGN KEY `InstructionVideo_workInstructionId_fkey`;

-- DropIndex
DROP INDEX `InstructionImage_workInstructionId_idx` ON `InstructionImage`;

-- DropIndex
DROP INDEX `InstructionVideo_workInstructionId_idx` ON `InstructionVideo`;

-- AlterTable
ALTER TABLE `InstructionImage` DROP COLUMN `workInstructionId`,
    ADD COLUMN `stepId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `InstructionVideo` DROP COLUMN `workInstructionId`,
    ADD COLUMN `stepId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `WorkInstruction` ADD COLUMN `workInstructionId` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `InstructionImage_stepId_idx` ON `InstructionImage`(`stepId`);

-- CreateIndex
CREATE INDEX `InstructionVideo_stepId_idx` ON `InstructionVideo`(`stepId`);

-- AddForeignKey
ALTER TABLE `InstructionImage` ADD CONSTRAINT `InstructionImage_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `WorkInstruction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionVideo` ADD CONSTRAINT `InstructionVideo_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `WorkInstruction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
