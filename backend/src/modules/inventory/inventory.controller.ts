import { Controller, Get } from '@nestjs/common';

@Controller('inventory')
export class InventoryController {
  @Get('health')
  health() {
    return {
      module: 'inventory',
      status: 'ready-for-evolution',
      plannedCapabilities: ['stock-balance', 'kardex', 'reservations', 'warehouse-transfers'],
    };
  }
}
