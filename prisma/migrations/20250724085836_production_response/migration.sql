/*
  Warnings:

  - Made the column `completed` on table `ProductionResponse` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE `ProductionResponse` MODIFY `completed` BOOLEAN NOT NULL DEFAULT false;
