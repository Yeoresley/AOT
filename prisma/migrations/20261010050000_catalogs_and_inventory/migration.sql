-- AlterTable
ALTER TABLE `consumableentry` ADD COLUMN `inventoryStockId` VARCHAR(191) NULL;

-- AlterTable
ALTER TABLE `inventoryitem` ADD COLUMN `deletedAt` DATETIME(3) NULL;

-- AlterTable
ALTER TABLE `warehouse` ADD COLUMN `code` VARCHAR(191) NULL;

-- CreateTable
CREATE TABLE `InventoryStock` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `stockOnHand` DECIMAL(14, 3) NOT NULL DEFAULT 0,
    `averageCostUsd` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `averageCostCup` DECIMAL(14, 4) NOT NULL DEFAULT 0,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `updatedAt` DATETIME(3) NOT NULL,

    INDEX `InventoryStock_warehouseId_inventoryItemId_idx`(`warehouseId`, `inventoryItemId`),
    UNIQUE INDEX `InventoryStock_inventoryItemId_warehouseId_key`(`inventoryItemId`, `warehouseId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `InventoryMovement` (
    `id` VARCHAR(191) NOT NULL,
    `inventoryItemId` VARCHAR(191) NOT NULL,
    `warehouseId` VARCHAR(191) NOT NULL,
    `type` ENUM('INITIAL', 'IN', 'OUT', 'ADJUSTMENT') NOT NULL,
    `quantity` DECIMAL(14, 3) NOT NULL,
    `unitCostUsd` DECIMAL(14, 4) NOT NULL,
    `unitCostCup` DECIMAL(14, 4) NOT NULL,
    `reference` VARCHAR(191) NULL,
    `notes` VARCHAR(191) NULL,
    `createdAt` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
    `inventoryStockId` VARCHAR(191) NULL,

    INDEX `InventoryMovement_inventoryItemId_warehouseId_createdAt_idx`(`inventoryItemId`, `warehouseId`, `createdAt`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE UNIQUE INDEX `Warehouse_code_key` ON `Warehouse`(`code`);

-- AddForeignKey
ALTER TABLE `ConsumableEntry` ADD CONSTRAINT `ConsumableEntry_inventoryStockId_fkey` FOREIGN KEY (`inventoryStockId`) REFERENCES `InventoryStock`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryStock` ADD CONSTRAINT `InventoryStock_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryStock` ADD CONSTRAINT `InventoryStock_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_inventoryItemId_fkey` FOREIGN KEY (`inventoryItemId`) REFERENCES `InventoryItem`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_warehouseId_fkey` FOREIGN KEY (`warehouseId`) REFERENCES `Warehouse`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `InventoryMovement` ADD CONSTRAINT `InventoryMovement_inventoryStockId_fkey` FOREIGN KEY (`inventoryStockId`) REFERENCES `InventoryStock`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
