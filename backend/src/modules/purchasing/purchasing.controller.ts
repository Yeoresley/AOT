import { Controller, Get } from '@nestjs/common';

@Controller('purchasing')
export class PurchasingController {
  @Get('health')
  health() {
    return {
      module: 'purchasing',
      status: 'ready-for-evolution',
      plannedCapabilities: ['purchase-requests', 'purchase-orders', 'supplier-bills'],
    };
  }
}
