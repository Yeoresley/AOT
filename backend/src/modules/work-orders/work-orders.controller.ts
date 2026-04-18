import { Body, Controller, Get, Param, Post } from '@nestjs/common';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { WorkOrdersService } from './work-orders.service';

@Controller('work-orders')
export class WorkOrdersController {
  constructor(private readonly service: WorkOrdersService) {}

  @Post()
  create(@Body() dto: CreateWorkOrderDto) {
    return this.service.create(dto);
  }

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Post(':id/calculate-preview')
  calculatePreview(@Param('id') id: string) {
    return this.service.calculatePreview(id);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Body() body: { closedBy: string }) {
    return this.service.close(id, body.closedBy);
  }
}
