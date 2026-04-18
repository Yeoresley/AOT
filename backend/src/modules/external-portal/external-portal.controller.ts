import { Controller, Get } from '@nestjs/common';

@Controller('external-portal')
export class ExternalPortalController {
  @Get('health')
  health() {
    return {
      module: 'external-portal',
      status: 'ready-for-evolution',
      plannedCapabilities: ['customer-tracking', 'document-downloads', 'limited-rbac'],
    };
  }
}
