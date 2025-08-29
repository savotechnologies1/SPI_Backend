/*
  Warnings:

  - You are about to alter the column `role` on the `employee` table. The data in that column could be lost. The data in that column will be cast from `VarChar(191)` to `VarChar(100)`.

*/
-- AlterTable
ALTER TABLE `employee` ADD COLUMN `address` VARCHAR(512) NOT NULL DEFAULT '',
    ADD COLUMN `employeeProfileImg` VARCHAR(255) NOT NULL DEFAULT '',
    ADD COLUMN `otpExpiresAt` DATETIME(3) NULL,
    ADD COLUMN `processLogin` BOOLEAN NULL DEFAULT false,
    MODIFY `role` VARCHAR(100) NOT NULL;
