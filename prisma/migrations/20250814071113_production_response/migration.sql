/*
  Warnings:

  - You are about to drop the column `barcode` on the `StockOrderSchedule` table. All the data in the column will be lost.

*/
-- DropIndex
DROP INDEX `StockOrderSchedule_barcode_key` ON `StockOrderSchedule`;

-- AlterTable
ALTER TABLE `ProductTree` ADD COLUMN `processDesc` VARCHAR(255) NULL,
    ADD COLUMN `processId` VARCHAR(10) NULL,
    ADD COLUMN `processOrderRequired` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `ProductionResponse` ADD COLUMN `remainingQty` INTEGER NULL DEFAULT 0,
    ADD COLUMN `scheduleQuantity` INTEGER NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `StockOrderSchedule` DROP COLUMN `barcode`,
    ADD COLUMN `remainingQty` INTEGER NULL DEFAULT 0,
    ADD COLUMN `scheduleQuantity` INTEGER NULL DEFAULT 0,
    ADD COLUMN `type` VARCHAR(100) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `WorkInstructionSteps` MODIFY `instruction` VARCHAR(2000) NOT NULL;

-- AlterTable
ALTER TABLE `production_step_tracking` ADD COLUMN `scapEntriesId` CHAR(36) NULL;

-- CreateTable
CREATE TABLE `supplier_inventory` (
    `id` CHAR(36) NOT NULL,
    `part_id` VARCHAR(100) NOT NULL,
    `minStock` INTEGER NULL,
    `availStock` INTEGER NULL,
    `cost` DOUBLE NULL,
    `supplier_id` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,

    UNIQUE INDEX `supplier_inventory_part_id_key`(`part_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scapEntries` (
    `id` CHAR(36) NOT NULL,
    `partId` CHAR(36) NULL,
    `processId` CHAR(36) NULL,
    `productId` CHAR(36) NULL,
    `returnQuantity` INTEGER NULL DEFAULT 0,
    `scrapStatus` BOOLEAN NULL DEFAULT false,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `type` VARCHAR(36) NULL,
    `returnSupplierId` VARCHAR(100) NULL,
    `supplierId` VARCHAR(100) NULL,
    `customersId` CHAR(36) NULL,
    `employeeId` CHAR(36) NULL,
    `stockOrderId` CHAR(36) NULL,

    INDEX `ScapEntries_processId_fkey`(`processId`),
    INDEX `ScapEntries_partId_fkey`(`partId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stationNotification` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NULL,
    `comment` VARCHAR(191) NULL,
    `enqueryImg` VARCHAR(191) NULL,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDeleted` BOOLEAN NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `supplier_inventory` ADD CONSTRAINT `supplier_inventory_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_inventory` ADD CONSTRAINT `supplier_inventory_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_step_tracking` ADD CONSTRAINT `production_step_tracking_scapEntriesId_fkey` FOREIGN KEY (`scapEntriesId`) REFERENCES `scapEntries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_customersId_fkey` FOREIGN KEY (`customersId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_stockOrderId_fkey` FOREIGN KEY (`stockOrderId`) REFERENCES `StockOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
