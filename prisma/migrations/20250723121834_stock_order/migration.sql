/*
  Warnings:

  - The primary key for the `supplier_orders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to alter the column `id` on the `supplier_orders` table. The data in that column could be lost. The data in that column will be cast from `VarChar(100)` to `Char(36)`.

*/
-- AlterTable
ALTER TABLE `StockOrder` ADD COLUMN `status` VARCHAR(60) NOT NULL DEFAULT '';

-- AlterTable
ALTER TABLE `supplier_orders` DROP PRIMARY KEY,
    MODIFY `id` CHAR(36) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- CreateIndex
CREATE INDEX `supplier_orders_supplier_part_id_fkey` ON `supplier_orders`(`part_id`);

-- AddForeignKey
ALTER TABLE `supplier_orders` ADD CONSTRAINT `supplier_orders_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;
