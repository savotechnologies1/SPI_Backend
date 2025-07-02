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
    `address` VARCHAR(191) NOT NULL,
    `billingTerms` VARCHAR(191) NOT NULL,
    `createdBy` VARCHAR(191) NOT NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,
    `isDeleted` BOOLEAN NOT NULL DEFAULT false,

    UNIQUE INDEX `customers_email_key`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employee` (
    `id` VARCHAR(10) NOT NULL,
    `firstName` VARCHAR(255) NULL,
    `lastName` VARCHAR(255) NULL,
    `fullName` VARCHAR(255) NULL,
    `employeeId` VARCHAR(255) NULL,
    `hourlyRate` VARCHAR(255) NULL,
    `shift` VARCHAR(255) NULL,
    `startDate` VARCHAR(255) NULL,
    `pin` VARCHAR(255) NULL,
    `shopFloorLogin` VARCHAR(50) NULL,
    `role` VARCHAR(50) NULL,
    `roles` ENUM('admin', 'superAdmin') NULL DEFAULT 'admin',
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

    UNIQUE INDEX `phoneNumber`(`phoneNumber`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `process` (
    `id` VARCHAR(10) NOT NULL,
    `processName` VARCHAR(255) NULL,
    `machineName` VARCHAR(255) NULL,
    `cycleTime` VARCHAR(255) NULL,
    `ratePerHour` VARCHAR(255) NULL,
    `orderNeeded` VARCHAR(255) NULL,
    `createdBy` VARCHAR(255) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `productnumber` (
    `id` VARCHAR(10) NOT NULL,
    `partFamily` VARCHAR(255) NULL,
    `productNumber` VARCHAR(255) NULL,
    `description` VARCHAR(255) NULL,
    `cost` VARCHAR(255) NULL,
    `leadTime` VARCHAR(255) NULL,
    `orderQuantity` VARCHAR(255) NULL,
    `companyName` VARCHAR(255) NULL,
    `minStock` VARCHAR(255) NULL,
    `availStock` VARCHAR(50) NULL,
    `cycleTime` VARCHAR(50) NULL,
    `prcessOrder` VARCHAR(255) NULL,
    `partImage` VARCHAR(255) NULL,
    `createdBy` VARCHAR(255) NULL,
    `isDeleted` BOOLEAN NULL DEFAULT false,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updatedAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

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

    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NULL,
    `email` VARCHAR(100) NULL,

    UNIQUE INDEX `email`(`email`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `supplier_orders` ADD CONSTRAINT `supplier_orders_supplier_id_fkey` FOREIGN KEY (`supplier_id`) REFERENCES `suppliers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
