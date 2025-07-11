-- CreateTable
CREATE TABLE `admin` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(100) NOT NULL,
    `password` VARCHAR(255) NOT NULL,
    `roles` ENUM('admin', 'superAdmin') NULL DEFAULT 'admin',
    `phoneNumber` VARCHAR(20) NULL,
    `tokens` JSON NULL,
    `otp` VARCHAR(10) NULL,
    `resetToken` CHAR(36) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,

    UNIQUE INDEX `email`(`email`),
    UNIQUE INDEX `phoneNumber`(`phoneNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `customers` (
    `id` CHAR(36) NOT NULL,
    `firstName` VARCHAR(191) NOT NULL,
    `lastName` VARCHAR(191) NOT NULL,
    `email` VARCHAR(191) NOT NULL,
    `address` VARCHAR(191) NULL,
    `billingTerms` VARCHAR(191) NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `customerPhone` VARCHAR(191) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee` (
    `id` CHAR(36) NOT NULL,
    `firstName` VARCHAR(255) NULL,
    `lastName` VARCHAR(255) NULL,
    `fullName` VARCHAR(255) NULL,
    `employeeId` VARCHAR(255) NULL,
    `hourlyRate` VARCHAR(255) NULL,
    `shift` VARCHAR(255) NULL,
    `startDate` VARCHAR(255) NULL,
    `pin` VARCHAR(255) NULL,
    `shopFloorLogin` VARCHAR(50) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'shopfloor',
    `phoneNumber` VARCHAR(20) NULL,
    `tokens` JSON NULL,
    `otp` VARCHAR(10) NULL,
    `resetToken` CHAR(36) NULL,
    `termsAccepted` BOOLEAN NULL,
    `status` VARCHAR(255) NULL,
    `createdBy` VARCHAR(255) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `email` VARCHAR(100) NULL,
    `password` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `phoneNumber`(`phoneNumber`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process` (
    `id` VARCHAR(10) NOT NULL,
    `processName` VARCHAR(255) NULL,
    `machineName` VARCHAR(255) NULL,
    `cycleTime` VARCHAR(255) NULL,
    `ratePerHour` VARCHAR(255) NULL,
    `orderNeeded` BOOLEAN NOT NULL,
    `createdBy` VARCHAR(255) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `partFamily` VARCHAR(255) NULL,
    `isProcessReq` BOOLEAN NOT NULL DEFAULT false,
    `processDesc` VARCHAR(255) NULL,
    `type` VARCHAR(50) NOT NULL DEFAULT '',

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `suppliers` (
    `id` VARCHAR(10) NOT NULL,
    `firstName` VARCHAR(255) NULL,
    `lastName` VARCHAR(255) NULL,
    `email` VARCHAR(255) NULL,
    `address` VARCHAR(255) NULL,
    `billingTerms` VARCHAR(10) NULL,
    `createdBy` VARCHAR(255) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_orders` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `order_number` VARCHAR(50) NULL,
    `order_date` VARCHAR(50) NULL,
    `supplier_id` VARCHAR(10) NULL,
    `part_name` VARCHAR(255) NULL,
    `quantity` VARCHAR(50) NULL,
    `cost` VARCHAR(50) NULL,
    `need_date` VARCHAR(50) NULL,
    `createdBy` VARCHAR(255) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `supplier_orders_supplier_id_fkey`(`supplier_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` CHAR(36) NOT NULL,
    `name` VARCHAR(100) NULL,
    `email` VARCHAR(100) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `otp` VARCHAR(10) NULL,
    `password` VARCHAR(255) NOT NULL,
    `phoneNumber` VARCHAR(20) NULL,
    `resetToken` CHAR(36) NULL,
    `role` VARCHAR(191) NOT NULL DEFAULT 'shopfloor',
    `tokens` JSON NULL,

    UNIQUE INDEX `email`(`email`),
    UNIQUE INDEX `phoneNumber`(`phoneNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `mailTemplate` (
    `id` CHAR(36) NOT NULL,
    `templateEvent` VARCHAR(191) NOT NULL,
    `active` BOOLEAN NOT NULL DEFAULT true,
    `subject` VARCHAR(191) NULL,
    `mailVariables` VARCHAR(191) NULL,
    `htmlBody` LONGTEXT NULL,
    `textBody` TEXT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` CHAR(36) NULL,
    `updatedBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    UNIQUE INDEX `mailTemplate_templateEvent_key`(`templateEvent`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockOrder` (
    `id` CHAR(36) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `orderDate` VARCHAR(191) NULL,
    `shipDate` VARCHAR(191) NULL,
    `customerId` VARCHAR(191) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `productNumber` VARCHAR(191) NOT NULL,
    `productDescription` VARCHAR(191) NOT NULL,
    `cost` VARCHAR(191) NOT NULL,
    `productQuantity` INTEGER NOT NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `totalCost` VARCHAR(191) NOT NULL,

    UNIQUE INDEX `StockOrder_orderNumber_key`(`orderNumber`),
    INDEX `StockOrder_customerId_fkey`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `CustomOrder` (
    `id` CHAR(36) NOT NULL,
    `orderNumber` VARCHAR(191) NOT NULL,
    `orderDate` DATETIME(3) NULL,
    `shipDate` DATETIME(3) NULL,
    `customerId` CHAR(36) NOT NULL,
    `customerName` VARCHAR(191) NOT NULL,
    `customerEmail` VARCHAR(191) NOT NULL,
    `customerPhone` VARCHAR(191) NOT NULL,
    `productNumber` VARCHAR(191) NOT NULL,
    `cost` DECIMAL(10, 2) NOT NULL,
    `productQuantity` INTEGER NOT NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `partNumber` VARCHAR(191) NOT NULL,
    `totalCost` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `CustomOrder_orderNumber_key`(`orderNumber`),
    INDEX `CustomOrder_customerId_fkey`(`customerId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProcessDetail` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `process` VARCHAR(191) NOT NULL,
    `assignTo` VARCHAR(191) NOT NULL,
    `totalTime` INTEGER NOT NULL,
    `customOrderId` CHAR(36) NOT NULL,

    INDEX `ProcessDetail_customOrderId_fkey`(`customOrderId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartNumber` (
    `part_id` CHAR(36) NOT NULL,
    `partFamily` CHAR(36) NOT NULL,
    `partNumber` CHAR(36) NOT NULL,
    `partDescription` VARCHAR(255) NOT NULL,
    `cost` DOUBLE NOT NULL,
    `leadTime` INTEGER NOT NULL,
    `companyName` VARCHAR(100) NOT NULL,
    `minStock` INTEGER NOT NULL,
    `cycleTime` INTEGER NULL,
    `processId` VARCHAR(10) NULL,
    `processDesc` VARCHAR(255) NULL,
    `type` VARCHAR(100) NOT NULL,
    `submittedBy` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `availStock` INTEGER NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `processOrderRequired` BOOLEAN NOT NULL DEFAULT false,
    `supplierOrderQty` INTEGER NULL,
    `createdBy` CHAR(36) NULL,

    UNIQUE INDEX `PartNumber_partNumber_key`(`partNumber`),
    INDEX `PartNumber_processId_fkey`(`processId`),
    PRIMARY KEY (`part_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `PartImage` (
    `id` CHAR(36) NOT NULL,
    `imageUrl` VARCHAR(255) NOT NULL,
    `partId` CHAR(36) NOT NULL,
    `type` VARCHAR(100) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `PartImage_partId_fkey`(`partId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductTree` (
    `id` CHAR(36) NOT NULL,
    `product_id` CHAR(36) NOT NULL,
    `part_id` CHAR(36) NULL,
    `partQuantity` INTEGER NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `instructionRequired` BOOLEAN NOT NULL DEFAULT false,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `ProductTree_part_id_idx`(`part_id`),
    INDEX `ProductTree_product_id_fkey`(`product_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkInstruction` (
    `id` CHAR(36) NOT NULL,
    `processId` CHAR(36) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `instructionTitle` VARCHAR(191) NULL,
    `productId` CHAR(36) NOT NULL,

    INDEX `WorkInstruction_processId_fkey`(`processId`),
    INDEX `WorkInstruction_productId_fkey`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkInstructionSteps` (
    `id` CHAR(36) NOT NULL,
    `workInstructionId` CHAR(36) NOT NULL,
    `stepNumber` INTEGER NOT NULL,
    `title` VARCHAR(191) NOT NULL,
    `instruction` VARCHAR(191) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `processId` VARCHAR(10) NULL,
    `part_id` CHAR(36) NOT NULL,
    `productTreeId` CHAR(36) NULL,

    INDEX `WorkInstructionSteps_part_id_fkey`(`part_id`),
    INDEX `WorkInstructionSteps_processId_fkey`(`processId`),
    INDEX `WorkInstructionSteps_productTreeId_fkey`(`productTreeId`),
    INDEX `WorkInstructionSteps_workInstructionId_fkey`(`workInstructionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstructionImage` (
    `id` CHAR(36) NOT NULL,
    `stepId` CHAR(36) NOT NULL,
    `imagePath` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InstructionImage_stepId_idx`(`stepId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstructionVideo` (
    `id` CHAR(36) NOT NULL,
    `stepId` CHAR(36) NOT NULL,
    `videoPath` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `workInstructionId` CHAR(36) NULL,

    INDEX `InstructionVideo_stepId_idx`(`stepId`),
    INDEX `InstructionVideo_workInstructionId_fkey`(`workInstructionId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `supplier_orders` ADD CONSTRAINT `supplier_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrder` ADD CONSTRAINT `StockOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomOrder` ADD CONSTRAINT `CustomOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessDetail` ADD CONSTRAINT `ProcessDetail_customOrderId_fkey` FOREIGN KEY (`customOrderId`) REFERENCES `CustomOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartNumber` ADD CONSTRAINT `PartNumber_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartImage` ADD CONSTRAINT `PartImage_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstruction` ADD CONSTRAINT `WorkInstruction_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstruction` ADD CONSTRAINT `WorkInstruction_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_productTreeId_fkey` FOREIGN KEY (`productTreeId`) REFERENCES `ProductTree`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_workInstructionId_fkey` FOREIGN KEY (`workInstructionId`) REFERENCES `WorkInstruction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionImage` ADD CONSTRAINT `InstructionImage_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `WorkInstructionSteps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionVideo` ADD CONSTRAINT `InstructionVideo_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `WorkInstructionSteps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionVideo` ADD CONSTRAINT `InstructionVideo_workInstructionId_fkey` FOREIGN KEY (`workInstructionId`) REFERENCES `WorkInstruction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
