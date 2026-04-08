import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
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

    const salaryUsdBase = workOrder.operations
      .flatMap((op) => op.workers)
      .reduce((acc, w) => acc + Number(w.salaryUsdPerHour) * Number(w.hours), 0);

    const salaryCupBase = workOrder.operations
      .flatMap((op) => op.workers)
      .reduce((acc, w) => acc + Number(w.salaryCupPerHour) * Number(w.hours), 0);

    const depreciationUsd = workOrder.operations
      .flatMap((op) => op.tools)
      .reduce((acc, t) => acc + Number(t.thdUsdApplied) * Number(t.hours), 0);

    const depreciationCup = workOrder.operations
      .flatMap((op) => op.tools)
      .reduce((acc, t) => acc + Number(t.thdCupApplied) * Number(t.hours), 0);

    const outsourcedUsd = workOrder.outsourcedServices.reduce((acc, s) => acc + Number(s.costUsd), 0);
    const outsourcedCup = workOrder.outsourcedServices.reduce((acc, s) => acc + Number(s.costCup), 0);
    const consumablesUsd = workOrder.consumables.reduce((acc, c) => acc + Number(c.costUsd), 0);
    const consumablesCup = workOrder.consumables.reduce((acc, c) => acc + Number(c.costCup), 0);
    const ppaUsd = workOrder.ppas.reduce((acc, p) => acc + Number(p.costUsd), 0);
    const ppaCup = workOrder.ppas.reduce((acc, p) => acc + Number(p.costCup), 0);

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

    return { status: 'closed', totals };
  }
}
