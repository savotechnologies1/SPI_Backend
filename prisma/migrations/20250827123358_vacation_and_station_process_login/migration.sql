/*
  Warnings:

  - The primary key for the `VacationRequest` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- AlterTable
ALTER TABLE `PartNumber` MODIFY `minStock` INTEGER NULL DEFAULT 0,
    MODIFY `availStock` INTEGER NULL DEFAULT 0,
    MODIFY `supplierOrderQty` INTEGER NULL DEFAULT 0;

-- AlterTable
ALTER TABLE `VacationRequest` DROP PRIMARY KEY,
    ADD COLUMN `createdBy` VARCHAR(255) NULL,
    ADD COLUMN `hours` INTEGER NULL,
    ADD COLUMN `isDeleted` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `notes` VARCHAR(191) NULL,
    MODIFY `id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);
