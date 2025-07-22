/*
  Warnings:

  - The primary key for the `supplier_orders` table will be changed. If it partially fails, the table could be left without primary key constraint.
  - You are about to drop the column `part_name` on the `supplier_orders` table. All the data in the column will be lost.
  - The primary key for the `suppliers` table will be changed. If it partially fails, the table could be left without primary key constraint.

*/
-- DropForeignKey
ALTER TABLE `supplier_orders` DROP FOREIGN KEY `supplier_orders_supplier_id_fkey`;

-- AlterTable
ALTER TABLE `supplier_orders` DROP PRIMARY KEY,
    DROP COLUMN `part_name`,
    ADD COLUMN `part_id` VARCHAR(100) NULL,
    MODIFY `id` VARCHAR(100) NOT NULL,
    MODIFY `supplier_id` VARCHAR(100) NULL,
    ADD PRIMARY KEY (`id`);

-- AlterTable
ALTER TABLE `suppliers` DROP PRIMARY KEY,
    MODIFY `id` VARCHAR(100) NOT NULL,
    ADD PRIMARY KEY (`id`);

-- AddForeignKey
ALTER TABLE `supplier_orders` ADD CONSTRAINT `supplier_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
