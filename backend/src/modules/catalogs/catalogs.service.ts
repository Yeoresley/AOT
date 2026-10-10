import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InventoryMovementType, Prisma } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import {
  InventoryItemDto,
  InventoryMovementDto,
  MachineToolDto,
  OperationCatalogDto,
  OperatorDto,
  WarehouseDto,
} from './catalogs.dto';

const WORK_HOURS_PER_YEAR = 12 * 192;

@Injectable()
export class CatalogsService {
  constructor(private readonly prisma: PrismaService) {}

  async list() {
    const [operators, machineTools, operations, inventoryItems, warehouses] = await Promise.all([
      this.prisma.operator.findMany({ where: { deletedAt: null }, orderBy: { fullName: 'asc' } }),
      this.prisma.machineTool.findMany({ where: { deletedAt: null }, orderBy: { description: 'asc' } }),
      this.prisma.operationCatalog.findMany({ where: { deletedAt: null }, orderBy: { description: 'asc' } }),
      this.prisma.inventoryItem.findMany({
        where: { deletedAt: null },
        include: {
          stocks: {
            include: {
              warehouse: { select: { id: true, code: true, name: true } },
              movements: { orderBy: { createdAt: 'desc' }, take: 1 },
            },
            orderBy: { warehouse: { name: 'asc' } },
          },
          movements: { orderBy: { createdAt: 'desc' }, take: 10, include: { warehouse: { select: { name: true } } } },
        },
        orderBy: { description: 'asc' },
      }),
      this.prisma.warehouse.findMany({
        where: { deletedAt: null },
        include: { _count: { select: { stocks: true } } },
        orderBy: { name: 'asc' },
      }),
    ]);
    return {
      operators,
      machineTools: machineTools.map((tool) => ({
        ...tool,
        annualDepreciationPct: Number(tool.depreciationRate) * 100,
        hourlyCostUsd: Number(tool.thdUsd),
        hourlyCostCup: Number(tool.thdCup),
      })),
      operations,
      inventoryItems,
      warehouses,
    };
  }

  createOperator(dto: OperatorDto) {
    if (!dto.fullName || dto.salaryUsdPerHour === undefined || dto.salaryCupPerHour === undefined) {
      throw new BadRequestException('Nombre y salarios por hora en USD y CUP son obligatorios');
    }
    return this.prisma.operator.create({
      data: {
        fullName: dto.fullName,
        salaryUsdPerHour: dto.salaryUsdPerHour,
        salaryCupPerHour: dto.salaryCupPerHour,
      },
    });
  }

  async updateOperator(id: string, dto: OperatorDto) {
    await this.requireExists(this.prisma.operator.findFirst({ where: { id, deletedAt: null } }), 'Trabajador no encontrado');
    return this.prisma.operator.update({ where: { id }, data: dto });
  }

  async deactivateOperator(id: string) {
    await this.requireExists(this.prisma.operator.findFirst({ where: { id, deletedAt: null } }), 'Trabajador no encontrado');
    return this.prisma.operator.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createMachineTool(dto: MachineToolDto) {
    if (
      !dto.description ||
      dto.valueUsd === undefined ||
      dto.valueCup === undefined ||
      dto.annualDepreciationPct === undefined
    ) {
      throw new BadRequestException('Descripción, valores USD/CUP y depreciación anual son obligatorios');
    }
    return this.prisma.machineTool.create({
      data: {
        description: dto.description,
        valueUsd: dto.valueUsd,
        valueCup: dto.valueCup,
        depreciationRate: dto.annualDepreciationPct / 100,
        thdUsd: this.hourlyDepreciation(dto.valueUsd, dto.annualDepreciationPct),
        thdCup: this.hourlyDepreciation(dto.valueCup, dto.annualDepreciationPct),
        isAft: dto.isAft ?? true,
      },
    });
  }

  async updateMachineTool(id: string, dto: MachineToolDto) {
    const current = await this.prisma.machineTool.findFirst({ where: { id, deletedAt: null } });
    if (!current) throw new NotFoundException('Herramienta o AFT no encontrado');
    const valueUsd = dto.valueUsd ?? Number(current.valueUsd);
    const valueCup = dto.valueCup ?? Number(current.valueCup);
    const depreciationPct = dto.annualDepreciationPct ?? Number(current.depreciationRate) * 100;
    return this.prisma.machineTool.update({
      where: { id },
      data: {
        description: dto.description,
        valueUsd,
        valueCup,
        depreciationRate: depreciationPct / 100,
        thdUsd: this.hourlyDepreciation(valueUsd, depreciationPct),
        thdCup: this.hourlyDepreciation(valueCup, depreciationPct),
        isAft: dto.isAft,
      },
    });
  }

  async deactivateMachineTool(id: string) {
    await this.requireExists(this.prisma.machineTool.findFirst({ where: { id, deletedAt: null } }), 'Herramienta o AFT no encontrado');
    return this.prisma.machineTool.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  createOperation(dto: OperationCatalogDto) {
    if (!dto.description) throw new BadRequestException('La descripción es obligatoria');
    return this.prisma.operationCatalog.create({
      data: { description: dto.description, defaultHours: dto.defaultHours },
    });
  }

  async updateOperation(id: string, dto: OperationCatalogDto) {
    await this.requireExists(this.prisma.operationCatalog.findFirst({ where: { id, deletedAt: null } }), 'Operación no encontrada');
    return this.prisma.operationCatalog.update({ where: { id }, data: dto });
  }

  async deactivateOperation(id: string) {
    await this.requireExists(this.prisma.operationCatalog.findFirst({ where: { id, deletedAt: null } }), 'Operación no encontrada');
    return this.prisma.operationCatalog.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createWarehouse(dto: WarehouseDto) {
    if (!dto.name) throw new BadRequestException('El nombre del almacén es obligatorio');
    return this.prisma.warehouse.create({ data: { code: dto.code, name: dto.name } });
  }

  async updateWarehouse(id: string, dto: WarehouseDto) {
    await this.requireExists(this.prisma.warehouse.findFirst({ where: { id, deletedAt: null } }), 'Almacén no encontrado');
    return this.prisma.warehouse.update({ where: { id }, data: dto });
  }

  async deactivateWarehouse(id: string) {
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id, deletedAt: null },
      include: { _count: { select: { stocks: true } } },
    });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');
    if (warehouse._count.stocks) throw new BadRequestException('No se puede desactivar un almacén que tiene existencias');
    return this.prisma.warehouse.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async createInventoryItem(dto: InventoryItemDto) {
    if (!dto.sku || !dto.description || !dto.unitMeasure) {
      throw new BadRequestException('Código, descripción y unidad de medida son obligatorios');
    }
    return this.prisma.inventoryItem.create({
      data: {
        sku: dto.sku,
        description: dto.description,
        unitMeasure: dto.unitMeasure,
        stockOnHand: 0,
        minStock: 0,
        averageCostUsd: dto.averageCostUsd ?? 0,
        averageCostCup: dto.averageCostCup ?? 0,
      },
    });
  }

  async updateInventoryItem(id: string, dto: InventoryItemDto) {
    await this.requireExists(this.prisma.inventoryItem.findFirst({ where: { id, deletedAt: null } }), 'Insumo no encontrado');
    return this.prisma.inventoryItem.update({ where: { id }, data: dto });
  }

  async deactivateInventoryItem(id: string) {
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id, deletedAt: null },
      include: { stocks: { where: { stockOnHand: { gt: 0 } } } },
    });
    if (!item) throw new NotFoundException('Insumo no encontrado');
    if (item.stocks.length) throw new BadRequestException('No se puede desactivar un insumo con existencias');
    return this.prisma.inventoryItem.update({ where: { id }, data: { deletedAt: new Date() } });
  }

  async recordInventoryMovement(dto: InventoryMovementDto) {
    const type = dto.type as InventoryMovementType;
    if (!Object.values(InventoryMovementType).includes(type)) {
      throw new BadRequestException('Tipo de movimiento inválido');
    }
    if (type !== InventoryMovementType.ADJUSTMENT && dto.quantity <= 0) {
      throw new BadRequestException('La cantidad debe ser mayor que cero');
    }
    const item = await this.prisma.inventoryItem.findFirst({
      where: { id: dto.inventoryItemId, deletedAt: null },
    });
    if (!item) throw new NotFoundException('Insumo no encontrado');
    const warehouse = await this.prisma.warehouse.findFirst({
      where: { id: dto.warehouseId, deletedAt: null },
    });
    if (!warehouse) throw new NotFoundException('Almacén no encontrado');

    return this.prisma.$transaction(async (tx) => {
      const current = await tx.inventoryStock.findUnique({
        where: { inventoryItemId_warehouseId: { inventoryItemId: item.id, warehouseId: warehouse.id } },
      });
      const currentQuantity = Number(current?.stockOnHand ?? 0);
      const quantity = type === InventoryMovementType.ADJUSTMENT
        ? dto.quantity
        : type === InventoryMovementType.OUT
          ? currentQuantity - dto.quantity
          : currentQuantity + dto.quantity;
      if (quantity < 0) throw new BadRequestException('La salida supera las existencias disponibles');

      const unitCostUsd = dto.unitCostUsd ?? Number(current?.averageCostUsd ?? item.averageCostUsd);
      const unitCostCup = dto.unitCostCup ?? Number(current?.averageCostCup ?? item.averageCostCup);
      let averageCostUsd = unitCostUsd;
      let averageCostCup = unitCostCup;
      if (current && type === InventoryMovementType.OUT) {
        averageCostUsd = Number(current.averageCostUsd);
        averageCostCup = Number(current.averageCostCup);
      } else if (current && type === InventoryMovementType.IN && quantity > 0) {
        averageCostUsd = (currentQuantity * Number(current.averageCostUsd) + dto.quantity * unitCostUsd) / quantity;
        averageCostCup = (currentQuantity * Number(current.averageCostCup) + dto.quantity * unitCostCup) / quantity;
      }

      const stock = await tx.inventoryStock.upsert({
        where: { inventoryItemId_warehouseId: { inventoryItemId: item.id, warehouseId: warehouse.id } },
        create: {
          inventoryItemId: item.id,
          warehouseId: warehouse.id,
          stockOnHand: quantity,
          averageCostUsd,
          averageCostCup,
        },
        update: { stockOnHand: quantity, averageCostUsd, averageCostCup },
      });
      const movement = await tx.inventoryMovement.create({
        data: {
          inventoryItemId: item.id,
          warehouseId: warehouse.id,
          type,
          quantity: dto.quantity,
          unitCostUsd,
          unitCostCup,
          reference: dto.reference,
          notes: dto.notes,
        },
      });
      return { stock, movement };
    });
  }

  private hourlyDepreciation(value: number, annualDepreciationPct: number) {
    return value * (annualDepreciationPct / 100) / WORK_HOURS_PER_YEAR;
  }

  private async requireExists<T>(result: Promise<T | null>, message: string): Promise<T> {
    const value = await result;
    if (!value) throw new NotFoundException(message);
    return value;
  }
}
