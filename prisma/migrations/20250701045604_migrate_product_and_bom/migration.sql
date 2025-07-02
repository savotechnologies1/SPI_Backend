/*
  Warnings:

  - The primary key for the `employee` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `roles` on the `employee` table. All the data in the column will be lost.
  - The primary key for the `users` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the `productnumber` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[email]` on the table `employee` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[phoneNumber]` on the table `users` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `employee` table without a default value. This is not possible if the table is not empty.
  - Made the column `role` on table `employee` required. This step will fail if there are existing NULL values in that column.
  - Made the column `orderNeeded` on table `process` required. This step will fail if there are existing NULL values in that column.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX `customers_email_key` ON `customers`;

-- AlterTable
ALTER TABLE `customers` ADD COLUMN `customerPhone` VARCHAR(191) NULL,
    MODIFY `address` VARCHAR(191) NULL,
    MODIFY `billingTerms` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `employee` DROP PRIMARY KEY,
    DROP COLUMN `roles`,
    ADD COLUMN `email` VARCHAR(100) NULL,
    ADD COLUMN `password` VARCHAR(255) NOT NULL,
    MODIFY `id` CHAR(36) NOT NULL,
    MODIFY `role` VARCHAR(191) NOT NULL DEFAULT 'shopfloor',
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `process` ADD COLUMN `partFamily` VARCHAR(255) NULL,
    MODIFY `orderNeeded` BOOLEAN NOT NULL;

-- AlterTable
ALTER TABLE `users` DROP PRIMARY KEY,
    ADD COLUMN `isDeleted` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `otp` VARCHAR(10) NULL,
    ADD COLUMN `password` VARCHAR(255) NOT NULL,
    ADD COLUMN `phoneNumber` VARCHAR(20) NULL,
    ADD COLUMN `resetToken` CHAR(36) NULL,
    ADD COLUMN `role` VARCHAR(191) NOT NULL DEFAULT 'shopfloor',
    ADD COLUMN `tokens` JSON NULL,
    MODIFY `id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- DropTable
DROP TABLE `productnumber`;

-- CreateTable
CREATE TABLE `mailTemplate` (
    `id` CHAR(36) NOT NULL,
    `templateEvent` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `subject` VARCHAR(191) NULL,
    `mailVariables` VARCHAR(191) NULL,
    `htmlBody` LONGTEXT NULL,
    `textBody` TEXT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` CHAR(36) NULL,
    `updatedBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mailTemplate_templateEvent_key`(`templateEvent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockOrder` (
    `id` CHAR(36) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `orderDate` VARCHAR(191) NULL,
    `shipDate` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `productNumber` VARCHAR(191) NOT NULL,
    `productDescription` VARCHAR(191) NOT NULL,
    `cost` VARCHAR(191) NOT NULL,
    `productQuantity` INTEGER NOT NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `StockOrder_orderNumber_key`(`orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomOrder` (
    `id` CHAR(36) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `orderDate` VARCHAR(191) NULL,
    `shipDate` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `productNumber` VARCHAR(191) NOT NULL,
    `productDescription` VARCHAR(191) NOT NULL,
    `cost` VARCHAR(191) NOT NULL,
    `productQuantity` INTEGER NOT NULL,
    `processAssign` JSON NOT NULL,
    `totalTime` VARCHAR(191) NOT NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `CustomOrder_orderNumber_key`(`orderNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartNumber` (
    `part_id` CHAR(36) NOT NULL,
    `partFamily` CHAR(36) NOT NULL,
    `partNumber` CHAR(36) NOT NULL,
    `partDescription` VARCHAR(255) NOT NULL,
    `cost` DOUBLE NOT NULL,
    `leadTime` INTEGER NOT NULL,
    `quantity` INTEGER NOT NULL,
    `companyName` VARCHAR(100) NOT NULL,
    `minStock` INTEGER NOT NULL,
    `availableStock` INTEGER NOT NULL,
    `cycleTime` VARCHAR(191) NOT NULL,
    `processOrder` BOOLEAN NOT NULL,
    `processId` VARCHAR(10) NOT NULL,
    `processDesc` VARCHAR(255) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `partImg` VARCHAR(255) NULL,
    `submittedBy` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `PartNumber_partNumber_key`(`partNumber`),
    PRIMARY KEY (`part_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productTree` (
    `id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `part_id` CHAR(36) NOT NULL,
    `quantity` INTEGER NOT NULL,

    INDEX `productTree_part_id_idx`(`part_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `email` ON `employee`(`email`);

-- CreateIndex
CREATE UNIQUE INDEX `phoneNumber` ON `users`(`phoneNumber`);

-- AddForeignKey
ALTER TABLE `StockOrder` ADD CONSTRAINT `StockOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomOrder` ADD CONSTRAINT `CustomOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartNumber` ADD CONSTRAINT `PartNumber_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `productTree` ADD CONSTRAINT `productTree_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;
