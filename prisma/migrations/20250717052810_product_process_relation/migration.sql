/*
  Warnings:

  - You are about to drop the column `part_id` on the `WorkInstructionSteps` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `InstructionImage` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `InstructionVideo` ADD COLUMN `isDeleted` BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE `WorkInstructionSteps` DROP COLUMN `part_id`;

-- AlterTable
ALTER TABLE `employee` ADD COLUMN `about` VARCHAR(512) NULL,
    ADD COLUMN `city` VARCHAR(100) NULL,
    ADD COLUMN `country` VARCHAR(100) NULL,
    ADD COLUMN `state` VARCHAR(100) NULL,
    ADD COLUMN `zipCode` VARCHAR(100) NULL;
