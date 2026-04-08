import { Module } from '@nestjs/common';
import { WorkOrdersController } from './work-orders.controller';
import { WorkOrdersService } from './work-orders.service';
import { WorkOrderCostingService } from './services/work-order-costing.service';

@Module({
  controllers: [WorkOrdersController],
  providers: [WorkOrdersService, WorkOrderCostingService],
})
export class WorkOrdersModule {}
