import { Body, Controller, Get, Param, Post, Req, UseGuards } from '@nestjs/common';
import { CreateWorkOrderDto } from './dto/create-work-order.dto';
import { AddWorkOrderOperationDto } from './dto/add-work-order-operation.dto';
import { WorkOrdersService } from './work-orders.service';
import { AuthenticatedRequest, JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('work-orders')
@UseGuards(JwtAuthGuard)
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

  @Get('options')
  getFormOptions() {
    return this.service.getFormOptions();
  }

  @Post(':id/operations')
  addOperation(@Param('id') id: string, @Body() dto: AddWorkOrderOperationDto) {
    return this.service.addOperation(id, dto);
  }

  @Post(':id/calculate-preview')
  calculatePreview(@Param('id') id: string) {
    return this.service.calculatePreview(id);
  }

  @Post(':id/close')
  close(@Param('id') id: string, @Req() request: AuthenticatedRequest) {
    return this.service.close(id, request.user.username);
  }
}
