import { Controller, Get } from '@nestjs/common';

@Controller('billing')
export class BillingController {
  @Get('health')
  health() {
    return {
      module: 'billing',
      status: 'ready-for-evolution',
      plannedCapabilities: ['invoice-issuance', 'tax-ledger', 'credit-notes'],
    };
  }
}
