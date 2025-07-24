/*
  Warnings:

  - You are about to alter the column `processId` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Char(36)`.
  - You are about to alter the column `orderId` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `Char(36)`.
  - You are about to alter the column `partId` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Char(36)`.

*/
-- DropForeignKey
ALTER TABLE `ProductionResponse` DROP FOREIGN KEY `ProductionResponse_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductionResponse` DROP FOREIGN KEY `ProductionResponse_partId_fkey`;

-- DropForeignKey
ALTER TABLE `ProductionResponse` DROP FOREIGN KEY `ProductionResponse_processId_fkey`;

-- AlterTable
ALTER TABLE `ProductionResponse` MODIFY `processId` CHAR(36) NOT NULL,
    MODIFY `orderId` CHAR(36) NOT NULL,
    MODIFY `partId` CHAR(36) NULL,
    MODIFY `type` VARCHAR(36) NULL,
    ALTER COLUMN `submittedBy` DROP DEFAULT;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `StockOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
