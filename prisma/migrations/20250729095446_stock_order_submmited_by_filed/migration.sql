-- AlterTable
ALTER TABLE `StockOrderSchedule` ADD COLUMN `submitted_by` VARCHAR(191) NULL;

-- CreateIndex
CREATE INDEX `submitted_by_submitted_by_fkey` ON `StockOrderSchedule`(`submitted_by`);

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_submitted_by_fkey` FOREIGN KEY (`submitted_by`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
