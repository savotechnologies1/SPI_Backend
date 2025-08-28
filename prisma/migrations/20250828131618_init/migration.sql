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
    `otpExpiresAt` DATETIME(3) NULL,
    `resetToken` CHAR(36) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `about` VARCHAR(512) NOT NULL DEFAULT '',
    `address` VARCHAR(512) NOT NULL DEFAULT '',
    `city` CHAR(50) NOT NULL DEFAULT '',
    `country` CHAR(50) NOT NULL DEFAULT '',
    `profileImg` VARCHAR(255) NOT NULL DEFAULT '',
    `state` CHAR(50) NOT NULL DEFAULT '',
    `zipCode` CHAR(50) NOT NULL DEFAULT '',

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
    `address` VARCHAR(255) NULL,
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
    `shopFloorLogin` BOOLEAN NULL DEFAULT false,
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
    `about` VARCHAR(512) NULL,
    `city` VARCHAR(100) NULL,
    `country` VARCHAR(100) NULL,
    `state` VARCHAR(100) NULL,
    `zipCode` VARCHAR(100) NULL,

    UNIQUE INDEX `phoneNumber`(`phoneNumber`),
    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `TimeClock` (
    `id` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `eventType` ENUM('CLOCK_IN', 'CLOCK_OUT', 'START_LUNCH', 'END_LUNCH', 'START_EXCEPTION', 'END_EXCEPTION') NOT NULL,
    `timestamp` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `createdBy` VARCHAR(255) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `VacationRequest` (
    `id` CHAR(36) NOT NULL,
    `employeeId` CHAR(36) NOT NULL,
    `startDate` DATETIME(3) NOT NULL,
    `endDate` DATETIME(3) NOT NULL,
    `reason` VARCHAR(191) NULL,
    `hours` INTEGER NULL,
    `notes` VARCHAR(191) NULL,
    `status` ENUM('PENDING', 'APPROVED', 'REJECTED') NOT NULL DEFAULT 'PENDING',
    `reviewedBy` VARCHAR(191) NULL,
    `createdBy` VARCHAR(255) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process` (
    `id` VARCHAR(10) NOT NULL,
    `processName` VARCHAR(255) NULL,
    `machineName` VARCHAR(255) NULL,
    `cycleTime` VARCHAR(255) NULL,
    `ratePerHour` DOUBLE NULL,
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
    `id` VARCHAR(100) NOT NULL,
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
    `id` CHAR(36) NOT NULL,
    `order_number` VARCHAR(50) NULL,
    `order_date` VARCHAR(50) NULL,
    `supplier_id` VARCHAR(100) NULL,
    `firstName` VARCHAR(255) NULL,
    `lastName` VARCHAR(255) NULL,
    `email` VARCHAR(100) NULL,
    `phone` VARCHAR(100) NULL,
    `quantity` INTEGER NULL,
    `cost` INTEGER NULL,
    `status` VARCHAR(191) NULL DEFAULT 'pending',
    `need_date` VARCHAR(50) NULL,
    `createdBy` VARCHAR(255) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `part_id` VARCHAR(100) NULL,

    INDEX `supplier_orders_supplier_id_fkey`(`supplier_id`),
    INDEX `supplier_orders_supplier_part_id_fkey`(`part_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `supplier_inventory` (
    `id` CHAR(36) NOT NULL,
    `part_id` VARCHAR(100) NOT NULL,
    `minStock` INTEGER NULL,
    `availStock` INTEGER NULL,
    `cost` DOUBLE NULL,
    `supplier_id` VARCHAR(100) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,

    UNIQUE INDEX `supplier_inventory_part_id_key`(`part_id`),
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
    `productDescription` TEXT NOT NULL,
    `cost` VARCHAR(191) NOT NULL,
    `productQuantity` INTEGER NOT NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `totalCost` VARCHAR(191) NOT NULL,
    `status` VARCHAR(60) NOT NULL DEFAULT '',
    `partId` VARCHAR(100) NOT NULL,

    UNIQUE INDEX `StockOrder_orderNumber_key`(`orderNumber`),
    INDEX `StockOrder_customerId_fkey`(`customerId`),
    INDEX `StockOrder_partId_fkey`(`partId`),
    INDEX `StockOrder_productNumber_fkey`(`productNumber`),
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
    `cost` DECIMAL(10, 2) NOT NULL,
    `productQuantity` INTEGER NOT NULL,
    `productId` CHAR(36) NULL,
    `partId` CHAR(36) NULL,
    `partNumber` VARCHAR(191) NULL,
    `type` VARCHAR(191) NULL,
    `status` VARCHAR(60) NOT NULL DEFAULT '',
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `totalCost` DECIMAL(10, 2) NOT NULL,

    UNIQUE INDEX `CustomOrder_orderNumber_key`(`orderNumber`),
    INDEX `CustomOrder_productId_fkey`(`productId`),
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
    `partFamily` CHAR(150) NOT NULL,
    `partNumber` CHAR(150) NOT NULL,
    `partDescription` VARCHAR(255) NULL,
    `type` VARCHAR(100) NOT NULL,
    `cost` DOUBLE NOT NULL,
    `leadTime` INTEGER NOT NULL,
    `minStock` INTEGER NULL DEFAULT 0,
    `availStock` INTEGER NULL DEFAULT 0,
    `supplierOrderQty` INTEGER NULL DEFAULT 0,
    `cycleTime` INTEGER NULL,
    `processId` VARCHAR(10) NULL,
    `processDesc` VARCHAR(255) NULL,
    `processOrderRequired` BOOLEAN NOT NULL DEFAULT false,
    `instructionRequired` BOOLEAN NOT NULL DEFAULT false,
    `companyName` VARCHAR(100) NOT NULL,
    `submittedBy` VARCHAR(100) NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

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
    `processOrderRequired` BOOLEAN NOT NULL DEFAULT false,
    `instructionRequired` BOOLEAN NOT NULL DEFAULT false,
    `processId` VARCHAR(10) NULL,
    `processDesc` VARCHAR(255) NULL,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `partNumberPart_id` CHAR(36) NULL,

    INDEX `ProductTree_part_id_idx`(`part_id`),
    INDEX `ProductTree_product_id_fkey`(`product_id`),
    UNIQUE INDEX `ProductTree_product_id_part_id_key`(`product_id`, `part_id`),
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
    `type` CHAR(36) NOT NULL,

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
    `instruction` VARCHAR(2000) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `processId` VARCHAR(10) NULL,
    `productTreeId` CHAR(36) NULL,
    `partNumberPart_id` CHAR(36) NULL,
    `workInstructionApplyId` CHAR(36) NULL,

    INDEX `WorkInstructionSteps_processId_fkey`(`processId`),
    INDEX `WorkInstructionSteps_productTreeId_fkey`(`productTreeId`),
    INDEX `WorkInstructionSteps_workInstructionId_fkey`(`workInstructionId`),
    INDEX `WorkInstructionSteps_workInstructionApplyId_fkey`(`workInstructionApplyId`),
    INDEX `WorkInstructionSteps_partNumberPart_id_fkey`(`partNumberPart_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `WorkInstructionApply` (
    `id` CHAR(36) NOT NULL,
    `instructionId` CHAR(36) NOT NULL,
    `processId` CHAR(36) NOT NULL,
    `instructionTitle` VARCHAR(191) NULL,
    `productId` CHAR(36) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `type` CHAR(36) NOT NULL,

    INDEX `WorkInstructionApply_productId_custom_fk`(`productId`),
    INDEX `WorkInstructionApply_instructionId_fkey`(`instructionId`),
    INDEX `WorkInstructionApply_processId_fkey`(`processId`),
    INDEX `WorkInstructionApply_productId_fkey`(`productId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InstructionImage` (
    `id` CHAR(36) NOT NULL,
    `stepId` CHAR(36) NULL,
    `imagePath` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

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
    `workInstructionApplyId` CHAR(36) NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    INDEX `InstructionVideo_stepId_idx`(`stepId`),
    INDEX `InstructionVideo_workInstructionId_fkey`(`workInstructionId`),
    INDEX `InstructionVideo_workInstructionApplyId_fkey`(`workInstructionApplyId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `processLogin` (
    `id` CHAR(36) NOT NULL,
    `processId` VARCHAR(191) NOT NULL,
    `orderId` VARCHAR(100) NOT NULL DEFAULT '',
    `userId` VARCHAR(191) NULL,
    `customersId` CHAR(36) NULL,
    `partNumberPart_id` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `updatedAt` DATETIME(3) NOT NULL,
    `type` CHAR(36) NULL,

    INDEX `ProductionResponse_orderId_fkey`(`orderId`),
    INDEX `ProductionResponse_processId_fkey`(`processId`),
    INDEX `processLogin_customersId_fkey`(`customersId`),
    INDEX `processLogin_partNumberPart_id_fkey`(`partNumberPart_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `StockOrderSchedule` (
    `id` CHAR(36) NOT NULL,
    `order_id` CHAR(36) NOT NULL,
    `order_type` VARCHAR(100) NOT NULL,
    `part_id` CHAR(36) NULL,
    `quantity` INTEGER NULL,
    `completedQuantity` INTEGER NULL DEFAULT 0,
    `scrapQuantity` INTEGER NULL DEFAULT 0,
    `scheduleQuantity` INTEGER NULL DEFAULT 0,
    `remainingQty` INTEGER NULL DEFAULT 0,
    `status` VARCHAR(60) NOT NULL DEFAULT 'new',
    `type` VARCHAR(100) NOT NULL DEFAULT '',
    `order_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `delivery_date` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `completed_date` DATETIME(3) NULL,
    `completed_by` VARCHAR(191) NULL,
    `submitted_by` VARCHAR(191) NULL,
    `processOrder` BOOLEAN NOT NULL DEFAULT false,
    `processId` VARCHAR(10) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `partNumberPart_id` CHAR(36) NULL,
    `stockOrderId` CHAR(36) NULL,
    `customOrderId` CHAR(36) NULL,

    INDEX `StockOrderSchedule_order_id_order_type_idx`(`order_id`, `order_type`),
    INDEX `StockOrderSchedule_part_id_idx`(`part_id`),
    INDEX `StockOrderSchedule_submitted_by_idx`(`submitted_by`),
    UNIQUE INDEX `StockOrderSchedule_order_id_part_id_order_type_key`(`order_id`, `part_id`, `order_type`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProductionResponse` (
    `id` CHAR(36) NOT NULL,
    `partId` CHAR(36) NULL,
    `processId` CHAR(36) NOT NULL,
    `orderId` CHAR(36) NULL,
    `customOrderId` VARCHAR(191) NULL,
    `instructionId` CHAR(36) NULL,
    `stepstartTime` DATETIME(3) NULL,
    `stepstartEnd` DATETIME(3) NULL,
    `quantity` BOOLEAN NULL DEFAULT false,
    `scheduleQuantity` INTEGER NULL DEFAULT 0,
    `remainingQty` INTEGER NULL DEFAULT 0,
    `completedQuantity` INTEGER NULL DEFAULT 0,
    `scrapQuantity` INTEGER NULL DEFAULT 0,
    `scrap` BOOLEAN NULL DEFAULT false,
    `cycleTimeStart` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cycleTimeEnd` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `submittedBy` VARCHAR(100) NULL,
    `submittedDateTime` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` CHAR(36) NULL,
    `stationUserId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `traniningStatus` BOOLEAN NOT NULL DEFAULT false,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `type` VARCHAR(36) NULL,
    `order_type` VARCHAR(100) NULL,
    `customersId` CHAR(36) NULL,

    INDEX `ProductionResponse_orderId_order_type_idx`(`orderId`, `order_type`),
    INDEX `ProductionResponse_orderId_fkey`(`orderId`),
    INDEX `ProductionResponse_processId_fkey`(`processId`),
    INDEX `ProductionResponse_partId_fkey`(`partId`),
    INDEX `ProductionResponse_stationUserId_fkey`(`stationUserId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `production_step_tracking` (
    `id` VARCHAR(191) NOT NULL,
    `status` VARCHAR(191) NOT NULL DEFAULT 'pending',
    `stepStartTime` DATETIME(3) NULL,
    `stepEndTime` DATETIME(3) NULL,
    `productionResponseId` VARCHAR(191) NOT NULL,
    `workInstructionStepId` VARCHAR(191) NOT NULL,
    `scapEntriesId` CHAR(36) NULL,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `ProcessOrderTable` (
    `id` CHAR(36) NOT NULL,
    `partId` CHAR(36) NULL,
    `processId` CHAR(36) NOT NULL,
    `orderId` CHAR(36) NOT NULL,
    `instructionId` CHAR(36) NULL,
    `quantity` INTEGER NULL,
    `completedQty` INTEGER NULL,
    `scrap` INTEGER NULL,
    `cycleTimeStart` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `cycleTimeEnd` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `submittedBy` VARCHAR(100) NULL,
    `submittedDateTime` DATETIME(3) NULL DEFAULT CURRENT_TIMESTAMP(3),
    `createdBy` CHAR(36) NULL,
    `userId` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `type` VARCHAR(36) NULL,
    `customersId` CHAR(36) NULL,

    INDEX `ProductionResponse_orderId_fkey`(`orderId`),
    INDEX `ProductionResponse_processId_fkey`(`processId`),
    INDEX `ProductionResponse_partId_fkey`(`partId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `scapEntries` (
    `id` CHAR(36) NOT NULL,
    `partId` CHAR(36) NULL,
    `processId` CHAR(36) NULL,
    `productId` CHAR(36) NULL,
    `returnQuantity` INTEGER NULL DEFAULT 0,
    `scrapStatus` BOOLEAN NULL DEFAULT false,
    `createdBy` CHAR(36) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,
    `type` VARCHAR(36) NULL,
    `returnSupplierId` VARCHAR(100) NULL,
    `supplierId` VARCHAR(100) NULL,
    `createdByAdminId` CHAR(36) NULL,
    `createdByEmployeeId` CHAR(36) NULL,
    `customersId` CHAR(36) NULL,
    `employeeId` CHAR(36) NULL,
    `stockOrderId` CHAR(36) NULL,

    INDEX `ScapEntries_processId_fkey`(`processId`),
    INDEX `ScapEntries_partId_fkey`(`partId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `stationNotification` (
    `id` VARCHAR(191) NOT NULL,
    `employeeId` VARCHAR(191) NULL,
    `comment` VARCHAR(191) NULL,
    `enqueryImg` VARCHAR(191) NULL,
    `status` BOOLEAN NOT NULL DEFAULT false,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `isDeleted` BOOLEAN NULL DEFAULT false,

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `TimeClock` ADD CONSTRAINT `TimeClock_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `VacationRequest` ADD CONSTRAINT `VacationRequest_employeeId_fkey` FOREIGN KEY (`employeeId`) REFERENCES `employee`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_orders` ADD CONSTRAINT `supplier_orders_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_orders` ADD CONSTRAINT `supplier_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_inventory` ADD CONSTRAINT `supplier_inventory_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `supplier_inventory` ADD CONSTRAINT `supplier_inventory_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrder` ADD CONSTRAINT `StockOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrder` ADD CONSTRAINT `StockOrder_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrder` ADD CONSTRAINT `StockOrder_productNumber_fkey` FOREIGN KEY (`productNumber`) REFERENCES `PartNumber`(`partNumber`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomOrder` ADD CONSTRAINT `CustomOrder_customerId_fkey` FOREIGN KEY (`customerId`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomOrder` ADD CONSTRAINT `CustomOrder_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `CustomOrder` ADD CONSTRAINT `CustomOrder_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessDetail` ADD CONSTRAINT `ProcessDetail_customOrderId_fkey` FOREIGN KEY (`customOrderId`) REFERENCES `CustomOrder`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartNumber` ADD CONSTRAINT `PartNumber_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `PartImage` ADD CONSTRAINT `PartImage_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductTree` ADD CONSTRAINT `ProductTree_partNumberPart_id_fkey` FOREIGN KEY (`partNumberPart_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstruction` ADD CONSTRAINT `WorkInstruction_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstruction` ADD CONSTRAINT `WorkInstruction_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_partNumberPart_id_fkey` FOREIGN KEY (`partNumberPart_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_productTreeId_fkey` FOREIGN KEY (`productTreeId`) REFERENCES `ProductTree`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_workInstructionApplyId_fkey` FOREIGN KEY (`workInstructionApplyId`) REFERENCES `WorkInstructionApply`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionSteps` ADD CONSTRAINT `WorkInstructionSteps_workInstructionId_fkey` FOREIGN KEY (`workInstructionId`) REFERENCES `WorkInstruction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionApply` ADD CONSTRAINT `WorkInstructionApply_instructionId_fkey` FOREIGN KEY (`instructionId`) REFERENCES `WorkInstruction`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionApply` ADD CONSTRAINT `WorkInstructionApply_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `WorkInstructionApply` ADD CONSTRAINT `WorkInstructionApply_productId_fkey` FOREIGN KEY (`productId`) REFERENCES `PartNumber`(`part_id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionImage` ADD CONSTRAINT `InstructionImage_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `WorkInstructionSteps`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionVideo` ADD CONSTRAINT `InstructionVideo_stepId_fkey` FOREIGN KEY (`stepId`) REFERENCES `WorkInstructionSteps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionVideo` ADD CONSTRAINT `InstructionVideo_workInstructionApplyId_fkey` FOREIGN KEY (`workInstructionApplyId`) REFERENCES `WorkInstructionApply`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InstructionVideo` ADD CONSTRAINT `InstructionVideo_workInstructionId_fkey` FOREIGN KEY (`workInstructionId`) REFERENCES `WorkInstruction`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `processLogin` ADD CONSTRAINT `processLogin_customersId_fkey` FOREIGN KEY (`customersId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `processLogin` ADD CONSTRAINT `processLogin_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `StockOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `processLogin` ADD CONSTRAINT `processLogin_partNumberPart_id_fkey` FOREIGN KEY (`partNumberPart_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `processLogin` ADD CONSTRAINT `processLogin_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_part_id_fkey` FOREIGN KEY (`part_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_submitted_by_fkey` FOREIGN KEY (`submitted_by`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_partNumberPart_id_fkey` FOREIGN KEY (`partNumberPart_id`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_stockOrderId_fkey` FOREIGN KEY (`stockOrderId`) REFERENCES `StockOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `StockOrderSchedule` ADD CONSTRAINT `StockOrderSchedule_customOrderId_fkey` FOREIGN KEY (`customOrderId`) REFERENCES `CustomOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `StockOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_customOrderId_fkey` FOREIGN KEY (`customOrderId`) REFERENCES `CustomOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_customersId_fkey` FOREIGN KEY (`customersId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProductionResponse` ADD CONSTRAINT `ProductionResponse_stationUserId_fkey` FOREIGN KEY (`stationUserId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_step_tracking` ADD CONSTRAINT `production_step_tracking_productionResponseId_fkey` FOREIGN KEY (`productionResponseId`) REFERENCES `ProductionResponse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_step_tracking` ADD CONSTRAINT `production_step_tracking_workInstructionStepId_fkey` FOREIGN KEY (`workInstructionStepId`) REFERENCES `WorkInstructionSteps`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `production_step_tracking` ADD CONSTRAINT `production_step_tracking_scapEntriesId_fkey` FOREIGN KEY (`scapEntriesId`) REFERENCES `scapEntries`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessOrderTable` ADD CONSTRAINT `ProcessOrderTable_orderId_fkey` FOREIGN KEY (`orderId`) REFERENCES `StockOrder`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessOrderTable` ADD CONSTRAINT `ProcessOrderTable_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessOrderTable` ADD CONSTRAINT `ProcessOrderTable_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `ProcessOrderTable` ADD CONSTRAINT `ProcessOrderTable_customersId_fkey` FOREIGN KEY (`customersId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_supplierId_fkey` FOREIGN KEY (`supplierId`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_partId_fkey` FOREIGN KEY (`partId`) REFERENCES `PartNumber`(`part_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_customersId_fkey` FOREIGN KEY (`customersId`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_processId_fkey` FOREIGN KEY (`processId`) REFERENCES `process`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_stockOrderId_fkey` FOREIGN KEY (`stockOrderId`) REFERENCES `StockOrder`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_createdByAdminId_fkey` FOREIGN KEY (`createdByAdminId`) REFERENCES `admin`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `scapEntries` ADD CONSTRAINT `scapEntries_createdByEmployeeId_fkey` FOREIGN KEY (`createdByEmployeeId`) REFERENCES `employee`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
