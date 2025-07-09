/*
  Warnings:

  - You are about to drop the column `processAssign` on the `CustomOrder` table. All the data in the column will be lost.
  - You are about to drop the column `productDescription` on the `CustomOrder` table. All the data in the column will be lost.
  - You are about to drop the column `totalTime` on the `CustomOrder` table. All the data in the column will be lost.
  - You are about to alter the column `orderDate` on the `CustomOrder` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.
  - You are about to alter the column `shipDate` on the `CustomOrder` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `DateTime(3)`.
  - You are about to alter the column `customerId` on the `CustomOrder` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Char(36)`.
  - You are about to alter the column `cost` on the `CustomOrder` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Decimal(10,2)`.
  - You are about to drop the column `availableStock` on the `PartNumber` table. All the data in the column will be lost.
  - You are about to drop the column `partImg` on the `PartNumber` table. All the data in the column will be lost.
  - You are about to drop the column `processOrder` on the `PartNumber` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `PartNumber` table. All the data in the column will be lost.
  - You are about to alter the column `cycleTime` on the `PartNumber` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to drop the `productTree` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `partNumber` to the `CustomOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCost` to the `CustomOrder` table without a default value. This is not possible if the table is not empty.
  - Added the required column `totalCost` to the `StockOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `CustomOrder` DROP FOREIGN KEY `CustomOrder_customerId_fkey`;

-- DropForeignKey
ALTER TABLE `PartNumber` DROP FOREIGN KEY `PartNumber_processId_fkey`;

-- DropForeignKey
ALTER TABLE `productTree` DROP FOREIGN KEY `productTree_part_id_fkey`;

-- DropIndex
DROP INDEX `CustomOrder_customerId_fkey` ON `CustomOrder`;

-- DropIndex
DROP INDEX `PartNumber_processId_fkey` ON `PartNumber`;

-- AlterTable
ALTER TABLE `CustomOrder` DROP COLUMN `processAssign`,
    DROP COLUMN `productDescription`,
    DROP COLUMN `totalTime`,
    ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `partNumber` VARCHAR(191) NOT NULL,
    ADD COLUMN `totalCost` DECIMAL(10, 2) NOT NULL,
    MODIFY `orderDate` DATETIME(3) NULL,
    MODIFY `shipDate` DATETIME(3) NULL,
    MODIFY `customerId` CHAR(36) NOT NULL,
    MODIFY `cost` DECIMAL(10, 2) NOT NULL;

-- AlterTable
ALTER TABLE `PartNumber` DROP COLUMN `availableStock`,
    DROP COLUMN `partImg`,
    DROP COLUMN `processOrder`,
    DROP COLUMN `quantity`,
    ADD COLUMN `availStock` INTEGER NULL,
    ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `processOrderRequired` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `supplierOrderQty` INTEGER NULL,
    MODIFY `cycleTime` INTEGER NULL,
    MODIFY `processId` VARCHAR(10) NULL,
    MODIFY `processDesc` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `StockOrder` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `totalCost` VARCHAR(191) NOT NULL;

-- AlterTable
ALTER TABLE `process` ADD COLUMN `isProcessReq` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `processDesc` VARCHAR(255) NULL,
    ADD COLUMN `type` VARCHAR(50) NOT NULL DEFAULT '';

-- DropTable
DROP TABLE `productTree`;

-- CreateTable
CREATE TABLE `ProcessDetail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `process` VARCHAR(191) NOT NULL,
    `assignTo` VARCHAR(191) NOT NULL,
    `totalTime` INTEGER NOT NULL,
    `customOrderId` CHAR(36) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartImage` (
    `id` CHAR(36) NOT NULL,
    `imageUrl` VARCHAR(255) NOT NULL,
    `partId` CHAR(36) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductTree` (
    `id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `part_id` CHAR(36) NOT NULL,
    `partQuantity` INTEGER NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `ProductTree_part_id_idx`(`part_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkInstruction` (
    `id` CHAR(36) NOT NULL,
    `processId` CHAR(36) NOT NULL,
    `part_id` CHAR(36) NOT NULL,
    `stepNumber` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `instruction` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstructionImage` (
    `id` CHAR(36) NOT NULL,
    `workInstructionId` CHAR(36) NOT NULL,
    `imagePath` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InstructionImage_workInstructionId_idx`(`workInstructionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstructionVideo` (
    `id` CHAR(36) NOT NULL,
    `workInstructionId` CHAR(36) NOT NULL,
    `videoPath` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InstructionVideo_workInstructionId_idx`(`workInstructionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `CustomOrder` ADD CONSTRAINT `CustomOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessDetail` ADD CONSTRAINT `ProcessDetail_customOrderId_fkey` FOREIGN KEY (`customOrderId`) REFERENCES `CustomOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartNumber` ADD CONSTRAINT `PartNumber_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartImage` ADD CONSTRAINT `PartImage_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstruction` ADD CONSTRAINT `WorkInstruction_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstruction` ADD CONSTRAINT `WorkInstruction_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionImage` ADD CONSTRAINT `InstructionImage_workInstructionId_fkey` FOREIGN KEY (`workInstructionId`) REFERENCES `WorkInstruction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionVideo` ADD CONSTRAINT `InstructionVideo_workInstructionId_fkey` FOREIGN KEY (`workInstructionId`) REFERENCES `WorkInstruction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
