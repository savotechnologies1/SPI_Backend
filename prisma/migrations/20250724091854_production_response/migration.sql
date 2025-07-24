/*
  Warnings:

  - You are about to drop the column `completed` on the `ProductionResponse` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `ProductionResponse` DROP COLUMN `completed`,
    ADD COLUMN `completedQuantity` INTEGER NOT NULL DEFAULT 0;
