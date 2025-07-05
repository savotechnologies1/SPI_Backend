/*
  Warnings:

  - You are about to drop the column `availableStock` on the `partnumber` table. All the data in the column will be lost.
  - You are about to drop the column `processOrder` on the `partnumber` table. All the data in the column will be lost.
  - You are about to drop the column `quantity` on the `partnumber` table. All the data in the column will be lost.
  - You are about to alter the column `cycleTime` on the `partnumber` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `Int`.
  - You are about to drop the column `quantity` on the `producttree` table. All the data in the column will be lost.
  - Added the required column `partQuantity` to the `productTree` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `customorder` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `partnumber` DROP COLUMN `availableStock`,
    DROP COLUMN `processOrder`,
    DROP COLUMN `quantity`,
    ADD COLUMN `availStock` INTEGER NULL,
    ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `processOrderRequired` BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN `supplierOrderQty` INTEGER NULL,
    MODIFY `cycleTime` INTEGER NULL,
    MODIFY `processDesc` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `producttree` DROP COLUMN `quantity`,
    ADD COLUMN `partQuantity` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `stockorder` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE `WorkInstruction` (
    `id` CHAR(36) NOT NULL,
    `processId` CHAR(36) NOT NULL,
    `partId` CHAR(36) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `WorkInstruction_processId_idx`(`processId`),
    INDEX `WorkInstruction_partId_idx`(`partId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `WorkInstruction` ADD CONSTRAINT `WorkInstruction_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstruction` ADD CONSTRAINT `WorkInstruction_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
