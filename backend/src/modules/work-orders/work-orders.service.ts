import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  WorkOrderStatus,
  WorkOrderOperationWorker,
  WorkOrderOperationTool,
  OutsourcedServiceEntry,
  Prisma,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { AddWorkOrderOperationDto } from './dto/add-work-order-operation.dto';
import { WorkOrderCostingService } from './services/work-order-costing.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costingService: WorkOrderCostingService,
  ) {}

  async create(dto: CreateWorkOrderDto) {
    const folio = `OT-${Date.now()}`;
    return this.prisma.workOrder.create({
      data: {
        ...dto,
        folio,
        receivedAt: new Date(dto.receivedAt),
        statusHistory: {
          create: [{ toStatus: WorkOrderStatus.OPEN, changedBy: dto.receivedBy, notes: 'Apertura inicial' }],
        },
      },
    });
  }

  async findAll() {
    return this.prisma.workOrder.findMany({
      where: { deletedAt: null },
      include: {
        client: true,
        vehicle: true,
        establishment: true,
        costSummary: true,
        operations: {
          include: {
            workers: { include: { operator: { select: { fullName: true } } } },
            tools: { include: { machineTool: { select: { description: true } } } },
            consumables: true,
            outsourcedServices: true,
          },
        },
      },
      orderBy: { receivedAt: 'desc' },
    });
  }

  async getFormOptions() {
    const [clients, vehicles, establishments, operations, operators, tools, stockItems] = await Promise.all([
      this.prisma.client.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.vehicle.findMany({
        select: { id: true, plate: true, brand: true, model: true },
        orderBy: { plate: 'asc' },
      }),
      this.prisma.establishment.findMany({
        where: { deletedAt: null },
        select: { id: true, name: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.operationCatalog.findMany({
        where: { deletedAt: null },
        select: { id: true, description: true, defaultHours: true },
        orderBy: { description: 'asc' },
      }),
      this.prisma.operator.findMany({
        where: { deletedAt: null },
        select: { id: true, fullName: true },
        orderBy: { fullName: 'asc' },
      }),
      this.prisma.machineTool.findMany({
        where: { deletedAt: null },
        select: { id: true, description: true },
        orderBy: { description: 'asc' },
      }),
      this.prisma.inventoryStock.findMany({
        where: { inventoryItem: { deletedAt: null }, warehouse: { deletedAt: null } },
        include: {
          inventoryItem: { select: { id: true, sku: true, description: true, unitMeasure: true } },
          warehouse: { select: { id: true, code: true, name: true } },
        },
        orderBy: { inventoryItem: { description: 'asc' } },
      }),
    ]);
    return { clients, vehicles, establishments, operations, operators, tools, stockItems };
  }

  async addOperation(workOrderId: string, dto: AddWorkOrderOperationDto) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, status: true },
    });
    if (!workOrder) throw new NotFoundException('Orden no encontrada');
    if (workOrder.status === WorkOrderStatus.CLOSED || workOrder.status === WorkOrderStatus.CANCELED) {
      throw new BadRequestException('No se pueden agregar operaciones a una orden cerrada o cancelada');
    }

    const workersDto = dto.workers ?? [];
    const toolsDto = dto.tools ?? [];
    const consumablesDto = dto.consumables ?? [];
    const outsourcedDto = dto.outsourcedServices ?? [];
    if (!workersDto.length && !toolsDto.length && !consumablesDto.length && !outsourcedDto.length) {
      throw new BadRequestException('Registra al menos un mecánico, herramienta, insumo o servicio externo');
    }

    const [catalog, operators, tools] = await Promise.all([
      this.prisma.operationCatalog.findFirst({
        where: { id: dto.operationCatalogId, deletedAt: null },
        select: { description: true },
      }),
      this.prisma.operator.findMany({
        where: { id: { in: workersDto.map((worker) => worker.operatorId) }, deletedAt: null },
        select: { id: true, salaryUsdPerHour: true, salaryCupPerHour: true },
      }),
      this.prisma.machineTool.findMany({
        where: { id: { in: toolsDto.map((tool) => tool.machineToolId) }, deletedAt: null },
        select: { id: true, thdUsd: true, thdCup: true },
      }),
    ]);

    if (!catalog) throw new NotFoundException('Operación no encontrada en el catálogo');
    if (operators.length !== new Set(workersDto.map((worker) => worker.operatorId)).size) {
      throw new NotFoundException('Uno o más mecánicos no existen o están inactivos');
    }
    if (tools.length !== new Set(toolsDto.map((tool) => tool.machineToolId)).size) {
      throw new NotFoundException('Una o más herramientas no existen o están inactivas');
    }

    const laborHours = workersDto.reduce((total, worker) => total + worker.hours, 0);
    for (const consumable of consumablesDto) {
      if (
        !consumable.inventoryStockId &&
        (!consumable.item?.trim() ||
          !consumable.unitMeasure?.trim() ||
          consumable.costUsd === undefined ||
          consumable.costCup === undefined)
      ) {
        throw new BadRequestException('Selecciona un insumo del almacén o completa descripción, unidad y ambos costos');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const savedConsumables: Prisma.ConsumableEntryCreateWithoutOperationInput[] = [];
      for (const consumable of consumablesDto) {
        if (!consumable.inventoryStockId) {
          savedConsumables.push({
            date: new Date(dto.operationDate),
            voucherNumber: consumable.voucherNumber?.trim() || 'SIN-COMPROBANTE',
            item: consumable.item!.trim(),
            unitMeasure: consumable.unitMeasure!.trim(),
            quantity: consumable.quantity,
            costUsd: consumable.costUsd!,
            costCup: consumable.costCup!,
            workOrder: { connect: { id: workOrderId } },
          });
          continue;
        }

        const stock = await tx.inventoryStock.findUnique({
          where: { id: consumable.inventoryStockId },
          include: { inventoryItem: true },
        });
        if (!stock || stock.inventoryItem.deletedAt) throw new NotFoundException('Insumo de almacén no encontrado');
        const decrement = await tx.inventoryStock.updateMany({
          where: { id: stock.id, stockOnHand: { gte: consumable.quantity } },
          data: { stockOnHand: { decrement: consumable.quantity } },
        });
        if (decrement.count !== 1) {
          throw new BadRequestException(`Existencias insuficientes de ${stock.inventoryItem.description}`);
        }
        const unitCostUsd = Number(stock.averageCostUsd);
        const unitCostCup = Number(stock.averageCostCup);
        await tx.inventoryMovement.create({
          data: {
            inventoryItemId: stock.inventoryItemId,
            warehouseId: stock.warehouseId,
            type: 'OUT',
            quantity: consumable.quantity,
            unitCostUsd,
            unitCostCup,
            reference: `OT ${workOrderId}`,
            notes: `Consumo en operación ${catalog.description}`,
          },
        });
        savedConsumables.push({
          date: new Date(dto.operationDate),
          voucherNumber: consumable.voucherNumber?.trim() || 'SALIDA-OT',
          item: stock.inventoryItem.description,
          unitMeasure: stock.inventoryItem.unitMeasure,
          quantity: consumable.quantity,
          costUsd: consumable.quantity * unitCostUsd,
          costCup: consumable.quantity * unitCostCup,
          inventoryStock: { connect: { id: stock.id } },
          workOrder: { connect: { id: workOrderId } },
        });
      }

      return tx.workOrderOperation.create({
        data: {
          workOrderId,
          operationCatalogId: dto.operationCatalogId,
          description: catalog.description,
          operationDate: new Date(dto.operationDate),
          hours: dto.hours ?? laborHours,
          notes: dto.notes,
          workers: {
            create: workersDto.map((worker) => {
              const operator = operators.find((item) => item.id === worker.operatorId)!;
              return {
                operatorId: operator.id,
                salaryUsdPerHour: operator.salaryUsdPerHour,
                salaryCupPerHour: operator.salaryCupPerHour,
                hours: worker.hours,
              };
            }),
          },
          tools: {
            create: toolsDto.map((tool) => {
              const machineTool = tools.find((item) => item.id === tool.machineToolId)!;
              return {
                machineToolId: machineTool.id,
                thdUsdApplied: machineTool.thdUsd,
                thdCupApplied: machineTool.thdCup,
                hours: tool.hours,
              };
            }),
          },
          consumables: { create: savedConsumables },
          outsourcedServices: {
            create: outsourcedDto.map((service) => ({
              description: service.description,
              provider: service.provider,
              date: new Date(dto.operationDate),
              costUsd: service.costUsd,
              costCup: service.costCup,
              workOrder: { connect: { id: workOrderId } },
            })),
          },
        },
        include: {
          workers: { include: { operator: { select: { fullName: true } } } },
          tools: { include: { machineTool: { select: { description: true } } } },
          consumables: true,
          outsourcedServices: true,
        },
      });
    });
  }

  async calculatePreview(workOrderId: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      include: {
        client: true,
        operations: { include: { workers: true, tools: true } },
        consumables: true,
        ppas: true,
        outsourcedServices: true,
      },
    });

    if (!workOrder) throw new NotFoundException('Orden no encontrada');

    const workers: WorkOrderOperationWorker[] = workOrder.operations.flatMap(
      (op: { workers: WorkOrderOperationWorker[] }): WorkOrderOperationWorker[] => op.workers,
    );
    const tools: WorkOrderOperationTool[] = workOrder.operations.flatMap((op: { tools: WorkOrderOperationTool[] }): WorkOrderOperationTool[] => op.tools);

    const salaryUsdBase = workers.reduce(
      (acc: number, worker: WorkOrderOperationWorker): number => acc + Number(worker.salaryUsdPerHour) * Number(worker.hours),
      0,
    );

    const salaryCupBase = workers.reduce(
      (acc: number, worker: WorkOrderOperationWorker): number => acc + Number(worker.salaryCupPerHour) * Number(worker.hours),
      0,
    );

    const depreciationUsd = tools.reduce(
      (acc: number, tool: WorkOrderOperationTool): number => acc + Number(tool.thdUsdApplied) * Number(tool.hours),
      0,
    );

    const depreciationCup = tools.reduce(
      (acc: number, tool: WorkOrderOperationTool): number => acc + Number(tool.thdCupApplied) * Number(tool.hours),
      0,
    );

    const outsourcedUsd = workOrder.outsourcedServices.reduce(
      (acc: number, service: OutsourcedServiceEntry): number => acc + Number(service.costUsd),
      0,
    );

    const outsourcedCup = workOrder.outsourcedServices.reduce(
      (acc: number, service: OutsourcedServiceEntry): number => acc + Number(service.costCup),
      0,
    );

    const consumablesUsd = workOrder.consumables.reduce(
      (acc: number, consumable: { costUsd: unknown }): number => acc + Number(consumable.costUsd),
      0,
    );

    const consumablesCup = workOrder.consumables.reduce(
      (acc: number, consumable: { costCup: unknown }): number => acc + Number(consumable.costCup),
      0,
    );

    const ppaUsd = workOrder.ppas.reduce((acc: number, ppa: { costUsd: unknown }): number => acc + Number(ppa.costUsd), 0);
    const ppaCup = workOrder.ppas.reduce((acc: number, ppa: { costCup: unknown }): number => acc + Number(ppa.costCup), 0);

    return this.costingService.calculate({
      salaryUsdBase,
      salaryCupBase,
      depreciationUsd,
      depreciationCup,
      outsourcedUsd,
      outsourcedCup,
      consumablesUsd,
      consumablesCup,
      ppaUsd,
      ppaCup,
      marginUsdPct: Number(workOrder.client.marginUsdPct),
      marginCupPct: Number(workOrder.client.marginCupPct),
    });
  }

  async close(workOrderId: string, closedBy: string) {
    const workOrder = await this.prisma.workOrder.findUnique({
      where: { id: workOrderId },
      select: { id: true, status: true, _count: { select: { operations: true } } },
    });
    if (!workOrder) throw new NotFoundException('Orden no encontrada');
    if (workOrder.status === WorkOrderStatus.CLOSED) throw new BadRequestException('Orden ya cerrada');
    if (workOrder.status === WorkOrderStatus.CANCELED) throw new BadRequestException('No se puede cerrar una orden cancelada');
    if (workOrder._count.operations === 0) {
      throw new BadRequestException('Agrega al menos un trabajo realizado antes de cerrar la orden');
    }

    const totals = await this.calculatePreview(workOrderId);

    await this.prisma.$transaction([
      this.prisma.workOrder.update({
        where: { id: workOrderId },
        data: { status: WorkOrderStatus.CLOSED, closedAt: new Date() },
      }),
      this.prisma.workOrderStatusHistory.create({
        data: {
          workOrderId,
          fromStatus: workOrder.status,
          toStatus: WorkOrderStatus.CLOSED,
          changedBy: closedBy,
        },
      }),
      this.prisma.workOrderCostSummary.upsert({
        where: { workOrderId },
        create: { workOrderId, ...totals },
        update: { ...totals },
      }),
      this.prisma.domainEventOutbox.create({
        data: {
          eventType: 'WORK_ORDER_CLOSED',
          aggregateType: 'work_order',
          aggregateId: workOrderId,
          payload: { totals: { ...totals }, closedBy },
        },
      }),
    ]);

    return { status: 'closed', totals };
  }
}
