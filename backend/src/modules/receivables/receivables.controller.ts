import { Controller, Get } from '@nestjs/common';

@Controller('receivables')
export class ReceivablesController {
  @Get('health')
  health() {
    return {
      module: 'receivables',
      status: 'ready-for-evolution',
      plannedCapabilities: ['accounts-receivable-ledger', 'collections', 'aging-report'],
    };
  }
}
