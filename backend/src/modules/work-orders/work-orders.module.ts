import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderCostingService } from './services/work-order-costing.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule],
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, WorkOrderCostingService],
})
export class WorkOrdersModule {}
