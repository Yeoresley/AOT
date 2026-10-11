import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import {
  ClientDto,
  InventoryItemDto,
  InventoryMovementDto,
  MachineToolDto,
  OperationCatalogDto,
  OperatorDto,
  VehicleDto,
  WarehouseDto,
} from './catalogs.dto';
import { CatalogsService } from './catalogs.service';

@Controller('catalogs')
@UseGuards(JwtAuthGuard)
export class CatalogsController {
  constructor(private readonly catalogs: CatalogsService) {}

  @Get()
  list() {
    return this.catalogs.list();
  }

  @Post('clients')
  createClient(@Body() dto: ClientDto) {
    return this.catalogs.createClient(dto);
  }

  @Post('vehicles')
  createVehicle(@Body() dto: VehicleDto) {
    return this.catalogs.createVehicle(dto);
  }

  @Post('operators')
  createOperator(@Body() dto: OperatorDto) {
    return this.catalogs.createOperator(dto);
  }

  @Patch('operators/:id')
  updateOperator(@Param('id') id: string, @Body() dto: OperatorDto) {
    return this.catalogs.updateOperator(id, dto);
  }

  @Delete('operators/:id')
  deactivateOperator(@Param('id') id: string) {
    return this.catalogs.deactivateOperator(id);
  }

  @Post('machine-tools')
  createMachineTool(@Body() dto: MachineToolDto) {
    return this.catalogs.createMachineTool(dto);
  }

  @Patch('machine-tools/:id')
  updateMachineTool(@Param('id') id: string, @Body() dto: MachineToolDto) {
    return this.catalogs.updateMachineTool(id, dto);
  }

  @Delete('machine-tools/:id')
  deactivateMachineTool(@Param('id') id: string) {
    return this.catalogs.deactivateMachineTool(id);
  }

  @Post('operations')
  createOperation(@Body() dto: OperationCatalogDto) {
    return this.catalogs.createOperation(dto);
  }

  @Patch('operations/:id')
  updateOperation(@Param('id') id: string, @Body() dto: OperationCatalogDto) {
    return this.catalogs.updateOperation(id, dto);
  }

  @Delete('operations/:id')
  deactivateOperation(@Param('id') id: string) {
    return this.catalogs.deactivateOperation(id);
  }

  @Post('warehouses')
  createWarehouse(@Body() dto: WarehouseDto) {
    return this.catalogs.createWarehouse(dto);
  }

  @Patch('warehouses/:id')
  updateWarehouse(@Param('id') id: string, @Body() dto: WarehouseDto) {
    return this.catalogs.updateWarehouse(id, dto);
  }

  @Delete('warehouses/:id')
  deactivateWarehouse(@Param('id') id: string) {
    return this.catalogs.deactivateWarehouse(id);
  }

  @Post('inventory-items')
  createInventoryItem(@Body() dto: InventoryItemDto) {
    return this.catalogs.createInventoryItem(dto);
  }

  @Patch('inventory-items/:id')
  updateInventoryItem(@Param('id') id: string, @Body() dto: InventoryItemDto) {
    return this.catalogs.updateInventoryItem(id, dto);
  }

  @Delete('inventory-items/:id')
  deactivateInventoryItem(@Param('id') id: string) {
    return this.catalogs.deactivateInventoryItem(id);
  }

  @Post('inventory-movements')
  recordInventoryMovement(@Body() dto: InventoryMovementDto) {
    return this.catalogs.recordInventoryMovement(dto);
  }
}
