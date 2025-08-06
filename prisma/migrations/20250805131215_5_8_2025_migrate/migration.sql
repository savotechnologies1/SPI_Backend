/*
  Warnings:

  - A unique constraint covering the columns `[barcode]` on the table `StockOrderSchedule` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `barcode` to the `StockOrderSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE `StockOrderSchedule` ADD COLUMN `barcode` VARCHAR(191) NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX `StockOrderSchedule_barcode_key` ON `StockOrderSchedule`(`barcode`);
