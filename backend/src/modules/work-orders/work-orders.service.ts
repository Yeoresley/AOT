import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  WorkOrderStatus,
  WorkOrderOperationWorker,
  WorkOrderOperationTool,
  OutsourcedServiceEntry,
} from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { WorkOrderCostingService } from './services/work-order-costing.service';
import { PlatformEventsService } from '../platform-events/platform-events.service';

@Injectable()
export class WorkOrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly costingService: WorkOrderCostingService,
    private readonly platformEvents: PlatformEventsService,
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
    return this.prisma.workOrder.findMany({ include: { client: true, vehicle: true, establishment: true } });
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
    const workOrder = await this.prisma.workOrder.findUnique({ where: { id: workOrderId } });
    if (!workOrder) throw new NotFoundException('Orden no encontrada');
    if (workOrder.status === WorkOrderStatus.CLOSED) throw new BadRequestException('Orden ya cerrada');

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
    ]);

    await this.platformEvents.publish('WORK_ORDER_CLOSED', 'work_order', workOrderId, { totals, closedBy });

    return { status: 'closed', totals };
  }
}
