/*
  Warnings:

  - You are about to drop the column `stepId` on the `ProcessOrderTable` table. All the data in the column will be lost.
  - You are about to drop the column `stepId` on the `ProductionResponse` table. All the data in the column will be lost.
  - You are about to alter the column `stepstartEnd` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `Char(36)` to `DateTime(3)`.
  - You are about to alter the column `stepstartTime` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `Char(36)` to `DateTime(3)`.
  - A unique constraint covering the columns `[order_id,part_id]` on the table `StockOrderSchedule` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `PartNumber` ADD COLUMN `instructionRequired` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `ProcessOrderTable` DROP COLUMN `stepId`,
    ADD COLUMN `instructionId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `ProductionResponse` DROP COLUMN `stepId`,
    ADD COLUMN `instructionId` CHAR(36) NULL,
    ADD COLUMN `scrapQuantity` INTEGER NULL DEFAULT 0,
    ADD COLUMN `traniningStatus` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `stepstartEnd` DATETIME(3) NULL,
    MODIFY `stepstartTime` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `StockOrderSchedule` ADD COLUMN `scrapQuantity` INTEGER NULL DEFAULT 0;

-- CreateTable
CREATE TABLE `production_step_tracking` (
    `id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `stepStartTime` DATETIME(3) NULL,
    `stepEndTime` DATETIME(3) NULL,
    `productionResponseId` VARCHAR(191) NOT NULL,
    `workInstructionStepId` VARCHAR(191) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `StockOrderSchedule_order_id_part_id_key` ON `StockOrderSchedule`(`order_id`, `part_id`);

-- AddForeignKey
ALTER TABLE `production_step_tracking` ADD CONSTRAINT `production_step_tracking_productionResponseId_fkey` FOREIGN KEY (`productionResponseId`) REFERENCES `ProductionResponse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_step_tracking` ADD CONSTRAINT `production_step_tracking_workInstructionStepId_fkey` FOREIGN KEY (`workInstructionStepId`) REFERENCES `WorkInstructionSteps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
