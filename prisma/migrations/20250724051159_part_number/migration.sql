-- CreateIndex
CREATE INDEX `StockOrder_productNumber_fkey` ON `StockOrder`(`productNumber`);

-- AddForeignKey
ALTER TABLE `StockOrder` ADD CONSTRAINT `StockOrder_productNumber_fkey` FOREIGN KEY (`productNumber`) REFERENCES `PartNumber`(`partNumber`) ON DELETE RESTRICT ON UPDATE CASCADE;
