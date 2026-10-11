ALTER TABLE `WorkOrder`
    ADD COLUMN `releasedTo` VARCHAR(191) NULL,
    ADD COLUMN `deliveryNotes` VARCHAR(191) NULL;

ALTER TABLE `Invoice`
    ADD COLUMN `currency` ENUM('USD', 'CUP') NOT NULL DEFAULT 'USD',
    ADD UNIQUE INDEX `Invoice_workOrderId_currency_key` (`workOrderId`, `currency`);

CREATE TABLE `ReceivablePayment` (
    `id` VARCHAR(191) NOT NULL,
    `receivableItemId` VARCHAR(191) NOT NULL,
    `currency` ENUM('USD', 'CUP') NOT NULL,
    `amount` DECIMAL(14, 4) NOT NULL,
    `paymentMethod` VARCHAR(191) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `receivedBy` VARCHAR(191) NOT NULL,
    `receivedAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),

    INDEX `ReceivablePayment_receivableItemId_receivedAt_idx` (`receivableItemId`, `receivedAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `ReceivablePayment`
    ADD CONSTRAINT `ReceivablePayment_receivableItemId_fkey`
    FOREIGN KEY (`receivableItemId`) REFERENCES `ReceivableItem`(`id`)
    ON DELETE RESTRICT ON UPDATE CASCADE;
