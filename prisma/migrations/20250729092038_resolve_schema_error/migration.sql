/*
  Warnings:

  - You are about to drop the column `createdAt` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `createdBy` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `customersId` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `employeeId` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `isDeleted` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `process_id` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `product_id` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `schedule_date` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `submitted_by` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `submitted_date` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `type` on the `StockOrderSchedule` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `StockOrderSchedule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `StockOrderSchedule` DROP FOREIGN KEY `StockOrderSchedule_customersId_fkey`;

-- DropForeignKey
ALTER TABLE `StockOrderSchedule` DROP FOREIGN KEY `StockOrderSchedule_process_id_fkey`;

-- DropForeignKey
ALTER TABLE `StockOrderSchedule` DROP FOREIGN KEY `StockOrderSchedule_product_id_fkey`;

-- DropIndex
DROP INDEX `ProductionResponse_process_id_fkey` ON `StockOrderSchedule`;

-- DropIndex
DROP INDEX `StockOrderSchedule_customersId_fkey` ON `StockOrderSchedule`;

-- DropIndex
DROP INDEX `StockOrderSchedule_product_id_fkey` ON `StockOrderSchedule`;

-- AlterTable
ALTER TABLE `StockOrderSchedule` DROP COLUMN `createdAt`,
    DROP COLUMN `createdBy`,
    DROP COLUMN `customersId`,
    DROP COLUMN `employeeId`,
    DROP COLUMN `isDeleted`,
    DROP COLUMN `process_id`,
    DROP COLUMN `product_id`,
    DROP COLUMN `schedule_date`,
    DROP COLUMN `submitted_by`,
    DROP COLUMN `submitted_date`,
    DROP COLUMN `type`,
    DROP COLUMN `updatedAt`,
    ADD COLUMN `completed_by` VARCHAR(191) NULL,
    ADD COLUMN `completed_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `delivery_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    ADD COLUMN `processId` VARCHAR(10) NULL,
    ADD COLUMN `processOrder` BOOLEAN NOT NULL DEFAULT false,
    MODIFY `status` VARCHAR(60) NOT NULL DEFAULT 'new';

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
