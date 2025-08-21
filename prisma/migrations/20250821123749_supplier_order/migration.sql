-- AlterTable
ALTER TABLE `supplier_orders` ADD COLUMN `email` VARCHAR(100) NULL,
    ADD COLUMN `firstName` VARCHAR(255) NULL,
    ADD COLUMN `lastName` VARCHAR(255) NULL,
    ADD COLUMN `phone` VARCHAR(100) NULL,
    ADD COLUMN `status` VARCHAR(191) NULL DEFAULT 'pending';
