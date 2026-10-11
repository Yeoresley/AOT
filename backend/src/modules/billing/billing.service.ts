import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Currency, Prisma, WorkOrderStatus } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { IssueInvoicesDto, RecordPaymentDto } from './billing.dto';

const invoiceInclude = {
  workOrder: {
    include: {
      client: true,
      vehicle: true,
      establishment: true,
      costSummary: true,
    },
  },
  receivableItems: { include: { payments: { orderBy: { receivedAt: 'desc' as const } } } },
} satisfies Prisma.InvoiceInclude;

@Injectable()
export class BillingService {
  constructor(private readonly prisma: PrismaService) {}

  async listInvoices() {
    return this.prisma.invoice.findMany({
      include: invoiceInclude,
      orderBy: { issueDate: 'desc' },
    });
  }

  async listReadyToInvoice() {
    return this.prisma.workOrder.findMany({
      where: { status: WorkOrderStatus.CLOSED, invoices: { none: {} } },
      include: { client: true, vehicle: true, establishment: true, costSummary: true },
      orderBy: { closedAt: 'desc' },
    });
  }

  async issueInvoices(workOrderId: string, dto: IssueInvoicesDto) {
    const dueDate = dto.dueDate ? new Date(dto.dueDate) : new Date();
    const issueDate = new Date();
    if (Number.isNaN(dueDate.getTime())) throw new BadRequestException('Fecha de vencimiento inválida');
    dueDate.setHours(23, 59, 59, 999);

    await this.prisma.$transaction(async (tx) => {
      const order = await tx.workOrder.findUnique({
        where: { id: workOrderId },
        include: { costSummary: true, invoices: { select: { currency: true } } },
      });
      if (!order) throw new NotFoundException('Orden de trabajo no encontrada');
      if (order.status !== WorkOrderStatus.CLOSED || !order.closedAt) {
        throw new BadRequestException('Solo se puede facturar una orden cerrada y entregada');
      }
      if (!order.costSummary) throw new BadRequestException('La orden no tiene un resumen de costos de cierre');

      const existing = new Set(order.invoices.map((invoice) => invoice.currency));
      for (const currency of [Currency.USD, Currency.CUP]) {
        if (existing.has(currency)) continue;
        const isUsd = currency === Currency.USD;
        const number = `FAC-${currency}-${order.folio}-${order.id.slice(-6)}`;
        const invoice = await tx.invoice.create({
          data: {
            invoiceNumber: number,
            workOrderId,
            currency,
            issueDate,
            dueDate,
            status: 'ISSUED',
            subtotalUsd: isUsd ? order.costSummary.totalCostUsd : 0,
            subtotalCup: isUsd ? 0 : order.costSummary.totalCostCup,
            totalUsd: isUsd ? order.costSummary.invoiceTotalUsd : 0,
            totalCup: isUsd ? 0 : order.costSummary.invoiceTotalCup,
          },
        });
        await tx.receivableItem.create({
          data: {
            invoiceId: invoice.id,
            dueDate,
            amountUsd: isUsd ? order.costSummary.invoiceTotalUsd : 0,
            amountCup: isUsd ? 0 : order.costSummary.invoiceTotalCup,
            paidUsd: 0,
            paidCup: 0,
            status: 'OPEN',
          },
        });
      }
    });

    return this.prisma.invoice.findMany({
      where: { workOrderId },
      include: invoiceInclude,
      orderBy: { currency: 'asc' },
    });
  }

  async listReceivables() {
    return this.prisma.receivableItem.findMany({
      where: { status: { in: ['OPEN', 'PARTIALLY_PAID'] } },
      include: {
        invoice: {
          include: {
            workOrder: { include: { client: true, vehicle: true, establishment: true } },
          },
        },
        payments: { orderBy: { receivedAt: 'desc' } },
      },
      orderBy: { dueDate: 'asc' },
    });
  }

  async recordPayment(receivableItemId: string, dto: RecordPaymentDto, receivedBy: string) {
    return this.prisma.$transaction(async (tx) => {
      const item = await tx.receivableItem.findUnique({
        where: { id: receivableItemId },
        include: { invoice: true },
      });
      if (!item) throw new NotFoundException('Cuenta por cobrar no encontrada');

      const isUsd = item.invoice.currency === Currency.USD;
      const amountDue = Number(isUsd ? item.amountUsd : item.amountCup);
      const alreadyPaid = Number(isUsd ? item.paidUsd : item.paidCup);
      const remaining = amountDue - alreadyPaid;
      if (dto.amount > remaining + 0.00005) {
        throw new BadRequestException(`El cobro supera el saldo pendiente de ${remaining.toFixed(4)} ${item.invoice.currency}`);
      }

      const update = await tx.receivableItem.updateMany({
        where: isUsd
          ? { id: item.id, paidUsd: item.paidUsd }
          : { id: item.id, paidCup: item.paidCup },
        data: {
          ...(isUsd ? { paidUsd: { increment: dto.amount } } : { paidCup: { increment: dto.amount } }),
          status: dto.amount >= remaining - 0.00005 ? 'PAID' : 'PARTIALLY_PAID',
        },
      });
      if (update.count !== 1) throw new BadRequestException('La cuenta cambió durante el cobro; actualiza e inténtalo nuevamente');

      const payment = await tx.receivablePayment.create({
        data: {
          receivableItemId,
          currency: item.invoice.currency,
          amount: dto.amount,
          paymentMethod: dto.paymentMethod,
          reference: dto.reference?.trim() || null,
          receivedBy,
        },
      });
      const status = dto.amount >= remaining - 0.00005 ? 'PAID' : 'PARTIALLY_PAID';
      await tx.invoice.update({ where: { id: item.invoiceId }, data: { status } });
      return { payment, status };
    });
  }
}
