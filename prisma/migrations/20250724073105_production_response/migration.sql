/*
  Warnings:

  - You are about to alter the column `cycleTimeStart` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `DateTime(3)`.
  - You are about to alter the column `cycleTimeEnd` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `DateTime(3)`.
  - You are about to alter the column `submittedTime` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `DateTime(3)`.
  - You are about to alter the column `submittedDate` on the `ProductionResponse` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `DateTime(3)`.

*/
-- AlterTable
ALTER TABLE `ProductionResponse` ADD COLUMN `submittedBy` VARCHAR(100) NOT NULL DEFAULT '',
    MODIFY `cycleTimeStart` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `cycleTimeEnd` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `submittedTime` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    MODIFY `submittedDate` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3);
