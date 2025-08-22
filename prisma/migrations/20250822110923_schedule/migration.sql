-- DropForeignKey
ALTER TABLE `scapEntries` DROP FOREIGN KEY `scapEntries_employeeId_fkey`;

-- DropIndex
DROP INDEX `scapEntries_employeeId_fkey` ON `scapEntries`;

-- AlterTable
ALTER TABLE `scapEntries` ADD COLUMN `createdByAdminId` CHAR(36) NULL,
    ADD COLUMN `createdByEmployeeId` CHAR(36) NULL;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_createdByAdminId_fkey` FOREIGN KEY (`createdByAdminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_createdByEmployeeId_fkey` FOREIGN KEY (`createdByEmployeeId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
