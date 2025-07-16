/*
  Warnings:

  - Added the required column `type` to the `WorkInstruction` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `WorkInstructionSteps` DROP FOREIGN KEY `WorkInstructionSteps_part_id_fkey`;

-- DropIndex
DROP INDEX `WorkInstructionSteps_part_id_fkey` ON `WorkInstructionSteps`;

-- AlterTable
ALTER TABLE `InstructionVideo` ADD COLUMN `workInstructionApplyId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `WorkInstruction` ADD COLUMN `type` CHAR(36) NOT NULL;

-- AlterTable
ALTER TABLE `WorkInstructionSteps` ADD COLUMN `partNumberPart_id` CHAR(36) NULL,
    ADD COLUMN `workInstructionApplyId` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `WorkInstructionApply` (
    `id` CHAR(36) NOT NULL,
    `instructionId` CHAR(36) NOT NULL,
    `processId` CHAR(36) NOT NULL,
    `instructionTitle` VARCHAR(191) NULL,
    `productId` CHAR(36) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `type` CHAR(36) NOT NULL,

    INDEX `WorkInstructionApply_instructionId_fkey`(`instructionId`),
    INDEX `WorkInstructionApply_processId_fkey`(`processId`),
    INDEX `WorkInstructionApply_productId_fkey`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `InstructionVideo_workInstructionApplyId_fkey` ON `InstructionVideo`(`workInstructionApplyId`);

-- CreateIndex
CREATE INDEX `WorkInstructionSteps_workInstructionApplyId_fkey` ON `WorkInstructionSteps`(`workInstructionApplyId`);

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_workInstructionApplyId_fkey` FOREIGN KEY (`workInstructionApplyId`) REFERENCES `WorkInstructionApply`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_partNumberPart_id_fkey` FOREIGN KEY (`partNumberPart_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionApply` ADD CONSTRAINT `WorkInstructionApply_instructionId_fkey` FOREIGN KEY (`instructionId`) REFERENCES `WorkInstruction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionApply` ADD CONSTRAINT `WorkInstructionApply_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionApply` ADD CONSTRAINT `WorkInstructionApply_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionVideo` ADD CONSTRAINT `InstructionVideo_workInstructionApplyId_fkey` FOREIGN KEY (`workInstructionApplyId`) REFERENCES `WorkInstructionApply`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
