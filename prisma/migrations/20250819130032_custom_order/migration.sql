/*
  Warnings:

  - You are about to drop the column `productNumber` on the `CustomOrder` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[product_id,part_id]` on the table `ProductTree` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[order_id,part_id,order_type]` on the table `StockOrderSchedule` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `order_type` to the `StockOrderSchedule` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `ProductionResponse` DROP FOREIGN KEY `ProductionResponse_orderId_fkey`;

-- DropForeignKey
ALTER TABLE `StockOrderSchedule` DROP FOREIGN KEY `StockOrderSchedule_order_id_fkey`;

-- DropIndex
DROP INDEX `ProductionResponse_order_id_fkey` ON `StockOrderSchedule`;

-- DropIndex
DROP INDEX `StockOrderSchedule_order_id_part_id_key` ON `StockOrderSchedule`;

-- AlterTable
ALTER TABLE `CustomOrder` DROP COLUMN `productNumber`,
    ADD COLUMN `partId` CHAR(36) NULL,
    ADD COLUMN `productId` CHAR(36) NULL,
    ADD COLUMN `status` VARCHAR(60) NOT NULL DEFAULT '',
    ADD COLUMN `type` VARCHAR(191) NULL,
    MODIFY `partNumber` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `PartNumber` MODIFY `partDescription` VARCHAR(255) NULL;

-- AlterTable
ALTER TABLE `ProductionResponse` ADD COLUMN `customOrderId` VARCHAR(191) NULL,
    ADD COLUMN `order_type` VARCHAR(100) NULL,
    MODIFY `orderId` CHAR(36) NULL;

-- AlterTable
ALTER TABLE `StockOrderSchedule` ADD COLUMN `customOrderId` CHAR(36) NULL,
    ADD COLUMN `order_type` VARCHAR(100) NOT NULL,
    ADD COLUMN `stockOrderId` CHAR(36) NULL;

-- CreateIndex
CREATE INDEX `CustomOrder_productId_fkey` ON `CustomOrder`(`productId`);

-- CreateIndex
CREATE UNIQUE INDEX `ProductTree_product_id_part_id_key` ON `ProductTree`(`product_id`, `part_id`);

-- CreateIndex
CREATE INDEX `ProductionResponse_orderId_order_type_idx` ON `ProductionResponse`(`orderId`, `order_type`);

-- CreateIndex
CREATE INDEX `StockOrderSchedule_order_id_order_type_idx` ON `StockOrderSchedule`(`order_id`, `order_type`);

-- CreateIndex
CREATE UNIQUE INDEX `StockOrderSchedule_order_id_part_id_order_type_key` ON `StockOrderSchedule`(`order_id`, `part_id`, `order_type`);

-- AddForeignKey
ALTER TABLE `CustomOrder` ADD CONSTRAINT `CustomOrder_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomOrder` ADD CONSTRAINT `CustomOrder_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_stockOrderId_fkey` FOREIGN KEY (`stockOrderId`) REFERENCES `StockOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_customOrderId_fkey` FOREIGN KEY (`customOrderId`) REFERENCES `CustomOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `StockOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_customOrderId_fkey` FOREIGN KEY (`customOrderId`) REFERENCES `CustomOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- RenameIndex
ALTER TABLE `StockOrderSchedule` RENAME INDEX `ProductionResponse_part_id_fkey` TO `StockOrderSchedule_part_id_idx`;

-- RenameIndex
ALTER TABLE `StockOrderSchedule` RENAME INDEX `submitted_by_submitted_by_fkey` TO `StockOrderSchedule_submitted_by_idx`;

-- RenameIndex
ALTER TABLE `WorkInstructionApply` RENAME INDEX `WorkInstructionApply_productId_fkey` TO `WorkInstructionApply_productId_custom_fk`;
