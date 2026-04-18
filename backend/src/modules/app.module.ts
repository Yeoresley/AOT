import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from '../database/prisma.module';
import { AuthModule } from './auth/auth.module';
import { WorkOrdersModule } from './work-orders/work-orders.module';
import { PlatformEventsModule } from './platform-events/platform-events.module';
import { InventoryModule } from './inventory/inventory.module';
import { PurchasingModule } from './purchasing/purchasing.module';
import { BillingModule } from './billing/billing.module';
import { ReceivablesModule } from './receivables/receivables.module';
import { ApprovalsModule } from './approvals/approvals.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { ExternalPortalModule } from './external-portal/external-portal.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    PlatformEventsModule,
    AuthModule,
    WorkOrdersModule,
    InventoryModule,
    PurchasingModule,
    BillingModule,
    ReceivablesModule,
    ApprovalsModule,
    AnalyticsModule,
    ExternalPortalModule,
  ],
})
export class AppModule {}
