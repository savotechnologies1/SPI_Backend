-- DropForeignKey
ALTER TABLE `InstructionImage` DROP FOREIGN KEY `InstructionImage_stepId_fkey`;

-- AlterTable
ALTER TABLE `InstructionImage` MODIFY `stepId` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `InstructionImage` ADD CONSTRAINT `InstructionImage_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `WorkInstructionSteps`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
