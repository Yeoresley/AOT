import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';
import { BillingService } from '../billing/billing.service';
import { RecordPaymentDto } from '../billing/billing.dto';

@Controller('receivables')
@UseGuards(JwtAuthGuard)
export class ReceivablesController {
  constructor(private readonly billing: BillingService) {}

  @Get()
  list() {
    return this.billing.listReceivables();
  }

  @Post(':id/payments')
  recordPayment(
    @Param('id') id: string,
    @Body() dto: RecordPaymentDto,
    @Req() request: AuthenticatedRequest,
  ) {
    return this.billing.recordPayment(id, dto, request.user.username);
  }
}
