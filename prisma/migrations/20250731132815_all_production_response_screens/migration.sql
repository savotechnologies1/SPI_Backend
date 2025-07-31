/*
  Warnings:

  - You are about to drop the column `userId` on the `ProductionResponse` table. All the data in the column will be lost.
  - You are about to alter the column `quantity` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `Int` to `TinyInt`.
  - You are about to alter the column `scrap` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `Int` to `TinyInt`.

*/
-- AlterTable
ALTER TABLE `ProductionResponse` DROP COLUMN `userId`,
    ADD COLUMN `completedQuantity` INTEGER NULL DEFAULT 0,
    ADD COLUMN `stationUserId` CHAR(36) NULL,
    MODIFY `quantity` BOOLEAN NULL DEFAULT false,
    MODIFY `scrap` BOOLEAN NULL DEFAULT false,
    MODIFY `cycleTimeStart` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `cycleTimeEnd` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `submittedBy` VARCHAR(100) NULL,
    MODIFY `stepId` CHAR(36) NULL,
    MODIFY `submittedDateTime` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3);

-- AlterTable
ALTER TABLE `StockOrderSchedule` ADD COLUMN `completedQuantity` INTEGER NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `admin` ADD COLUMN `otpExpiresAt` DATETIME(3) NULL;

-- CreateTable
CREATE TABLE `ProcessOrderTable` (
    `id` CHAR(36) NOT NULL,
    `partId` CHAR(36) NULL,
    `processId` CHAR(36) NOT NULL,
    `orderId` CHAR(36) NOT NULL,
    `stepId` CHAR(36) NULL,
    `quantity` INTEGER NULL,
    `completedQty` INTEGER NULL,
    `scrap` INTEGER NULL,
    `cycleTimeStart` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cycleTimeEnd` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `submittedBy` VARCHAR(100) NULL,
    `submittedDateTime` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` CHAR(36) NULL,
    `userId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `type` VARCHAR(36) NULL,
    `customersId` CHAR(36) NULL,

    INDEX `ProductionResponse_orderId_fkey`(`orderId`),
    INDEX `ProductionResponse_processId_fkey`(`processId`),
    INDEX `ProductionResponse_partId_fkey`(`partId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `ProductionResponse_stationUserId_fkey` ON `ProductionResponse`(`stationUserId`);

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_stationUserId_fkey` FOREIGN KEY (`stationUserId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessOrderTable` ADD CONSTRAINT `ProcessOrderTable_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `StockOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessOrderTable` ADD CONSTRAINT `ProcessOrderTable_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessOrderTable` ADD CONSTRAINT `ProcessOrderTable_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessOrderTable` ADD CONSTRAINT `ProcessOrderTable_customersId_fkey` FOREIGN KEY (`customersId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
