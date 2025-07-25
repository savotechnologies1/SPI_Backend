/*
  Warnings:

  - A unique constraint covering the columns `[product_id]` on the table `ProductTree` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE `StockOrder` ADD COLUMN `productId` VARCHAR(100) NOT NULL DEFAULT '';

-- CreateTable
CREATE TABLE `_StockOrderToTrees` (
    `A` CHAR(36) NOT NULL,
    `B` CHAR(36) NOT NULL,

    UNIQUE INDEX `_StockOrderToTrees_AB_unique`(`A`, `B`),
    INDEX `_StockOrderToTrees_B_index`(`B`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `ProductTree_product_id_key` ON `ProductTree`(`product_id`);

-- AddForeignKey
ALTER TABLE `StockOrder` ADD CONSTRAINT `StockOrder_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `ProductTree`(`product_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_StockOrderToTrees` ADD CONSTRAINT `_StockOrderToTrees_A_fkey` FOREIGN KEY (`A`) REFERENCES `ProductTree`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `_StockOrderToTrees` ADD CONSTRAINT `_StockOrderToTrees_B_fkey` FOREIGN KEY (`B`) REFERENCES `StockOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
