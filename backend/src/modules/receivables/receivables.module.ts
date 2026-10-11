import { Module } from '@nestjs/common';
import { ReceivablesController } from './receivables.controller';
import { BillingModule } from '../billing/billing.module';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [BillingModule, AuthModule],
  controllers: [ReceivablesController],
})
export class ReceivablesModule {}
