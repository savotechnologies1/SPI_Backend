/*
  Warnings:

  - You are about to drop the column `stockOrderId` on the `ProductTree` table. All the data in the column will be lost.
  - You are about to drop the column `productId` on the `StockOrder` table. All the data in the column will be lost.
  - You are about to drop the `_StockOrderToTrees` table. If the table is not empty, all the data it contains will be lost.
  - Added the required column `partId` to the `StockOrder` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ProductTree` DROP FOREIGN KEY `ProductTree_product_id_fkey`;

-- DropForeignKey
ALTER TABLE `ProductTree` DROP FOREIGN KEY `ProductTree_stockOrderId_fkey`;

-- DropForeignKey
ALTER TABLE `StockOrder` DROP FOREIGN KEY `StockOrder_productId_fkey`;

-- DropForeignKey
ALTER TABLE `_StockOrderToTrees` DROP FOREIGN KEY `_StockOrderToTrees_A_fkey`;

-- DropForeignKey
ALTER TABLE `_StockOrderToTrees` DROP FOREIGN KEY `_StockOrderToTrees_B_fkey`;

-- DropIndex
DROP INDEX `ProductTree_product_id_key` ON `ProductTree`;

-- DropIndex
DROP INDEX `ProductTree_stockOrderId_fkey` ON `ProductTree`;

-- DropIndex
DROP INDEX `StockOrder_productId_fkey` ON `StockOrder`;

-- AlterTable
ALTER TABLE `ProductTree` DROP COLUMN `stockOrderId`;

-- AlterTable
ALTER TABLE `StockOrder` DROP COLUMN `productId`,
    ADD COLUMN `partId` VARCHAR(100) NOT NULL;

-- AlterTable
ALTER TABLE `StockOrderSchedule` ADD COLUMN `partNumberPart_id` CHAR(36) NULL;

-- DropTable
DROP TABLE `_StockOrderToTrees`;

-- CreateIndex
CREATE INDEX `StockOrder_partId_fkey` ON `StockOrder`(`partId`);

-- AddForeignKey
ALTER TABLE `StockOrder` ADD CONSTRAINT `StockOrder_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_partNumberPart_id_fkey` FOREIGN KEY (`partNumberPart_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;
