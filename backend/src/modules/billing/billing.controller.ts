import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from './billing.service';
import { IssueInvoicesDto } from './billing.dto';

@Controller('billing')
@UseGuards(JwtAuthGuard)
export class BillingController {
  constructor(private readonly billing: BillingService) {}

  @Get('invoices')
  listInvoices() {
    return this.billing.listInvoices();
  }

  @Get('ready-to-invoice')
  listReadyToInvoice() {
    return this.billing.listReadyToInvoice();
  }

  @Post('work-orders/:workOrderId/issue')
  issueInvoices(@Param('workOrderId') workOrderId: string, @Body() dto: IssueInvoicesDto) {
    return this.billing.issueInvoices(workOrderId, dto);
  }
}
