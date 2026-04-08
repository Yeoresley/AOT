import { Controller, Get } from '@nestjs/common';

@Controller('approvals')
export class ApprovalsController {
  @Get('health')
  health() {
    return {
      module: 'approvals',
      status: 'ready-for-evolution',
      plannedCapabilities: ['workflow-rules', 'approval-levels', 'decision-audit-trail'],
    };
  }
}
