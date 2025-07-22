/*
  Warnings:

  - You are about to alter the column `quantity` on the `supplier_orders` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Int`.
  - You are about to alter the column `cost` on the `supplier_orders` table. The data in that column could be lost. The data in that column will be cast from `VarChar(50)` to `Int`.

*/
-- AlterTable
ALTER TABLE `supplier_orders` MODIFY `quantity` INTEGER NULL,
    MODIFY `cost` INTEGER NULL;
