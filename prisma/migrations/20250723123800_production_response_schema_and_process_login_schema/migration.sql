-- CreateTable
CREATE TABLE `processLogin` (
    `id` CHAR(36) NOT NULL,
    `processId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(100) NOT NULL DEFAULT '',
    `userId` VARCHAR(191) NULL,
    `customersId` CHAR(36) NULL,
    `partNumberPart_id` CHAR(36) NULL,

    INDEX `ProductionResponse_orderId_fkey`(`orderId`),
    INDEX `ProductionResponse_processId_fkey`(`processId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductionResponse` (
    `id` CHAR(36) NOT NULL,
    `processId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(100) NOT NULL DEFAULT '',
    `partId` VARCHAR(191) NULL,
    `quantity` INTEGER NOT NULL,
    `scrap` INTEGER NOT NULL,
    `cycleTimeStart` VARCHAR(100) NOT NULL DEFAULT '',
    `cycleTimeEnd` VARCHAR(100) NOT NULL DEFAULT '',
    `submittedTime` VARCHAR(100) NOT NULL DEFAULT '',
    `submittedDate` VARCHAR(100) NOT NULL DEFAULT '',
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `totalCost` VARCHAR(191) NOT NULL,
    `status` VARCHAR(60) NOT NULL DEFAULT '',
    `customersId` CHAR(36) NULL,

    INDEX `ProductionResponse_orderId_fkey`(`orderId`),
    INDEX `ProductionResponse_processId_fkey`(`processId`),
    INDEX `ProductionResponse_partId_fkey`(`partId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `processLogin` ADD CONSTRAINT `processLogin_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `processLogin` ADD CONSTRAINT `processLogin_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `StockOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `processLogin` ADD CONSTRAINT `processLogin_customersId_fkey` FOREIGN KEY (`customersId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `processLogin` ADD CONSTRAINT `processLogin_partNumberPart_id_fkey` FOREIGN KEY (`partNumberPart_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_customersId_fkey` FOREIGN KEY (`customersId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `StockOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;
