/*
  Warnings:

  - You are about to drop the column `submitted_by` on the `StockOrderSchedule` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE `StockOrderSchedule` DROP FOREIGN KEY `StockOrderSchedule_submitted_by_fkey`;

-- DropIndex
DROP INDEX `StockOrderSchedule_order_id_order_type_idx` ON `StockOrderSchedule`;

-- DropIndex
DROP INDEX `StockOrderSchedule_submitted_by_idx` ON `StockOrderSchedule`;

-- AlterTable
ALTER TABLE `StockOrderSchedule` DROP COLUMN `submitted_by`,
    ADD COLUMN `adminId` CHAR(36) NULL,
    ADD COLUMN `submittedByAdminId` VARCHAR(191) NULL,
    ADD COLUMN `submittedByEmployeeId` VARCHAR(191) NULL;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_submittedByEmployeeId_fkey` FOREIGN KEY (`submittedByEmployeeId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_submittedByAdminId_fkey` FOREIGN KEY (`submittedByAdminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_adminId_fkey` FOREIGN KEY (`adminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
