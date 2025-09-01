-- AlterTable
ALTER TABLE `StockOrderSchedule` ADD COLUMN `completed_EmpId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `TimeClock` ADD COLUMN `timezone` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `stationNotification` ADD COLUMN `createdBy` CHAR(36) NULL,
    ADD COLUMN `stationUserId` CHAR(36) NULL,
    ADD COLUMN `updatedAt` DATETIME(3) NULL;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_completed_EmpId_fkey` FOREIGN KEY (`completed_EmpId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
