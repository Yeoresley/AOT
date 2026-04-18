import { Controller, Get } from '@nestjs/common';

@Controller('analytics')
export class AnalyticsController {
  @Get('health')
  health() {
    return {
      module: 'analytics',
      status: 'ready-for-evolution',
      plannedCapabilities: ['executive-kpis', 'forecasting', 'drill-down-cubes'],
    };
  }
}
