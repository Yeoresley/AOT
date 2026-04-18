import { Module } from '@nestjs/common';
import { ExternalPortalController } from './external-portal.controller';

@Module({
  controllers: [ExternalPortalController],
})
export class ExternalPortalModule {}
