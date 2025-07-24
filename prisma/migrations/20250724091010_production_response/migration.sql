/*
  Warnings:

  - You are about to alter the column `shopFloorLogin` on the `employee` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `TinyInt`.

*/
-- AlterTable
ALTER TABLE `employee` MODIFY `shopFloorLogin` BOOLEAN NULL DEFAULT false;
