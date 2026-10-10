import { Type } from 'class-transformer';
import {
  IsArray,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Min,
  ValidateNested,
} from 'class-validator';

export class WorkOrderOperationWorkerDto {
  @IsString()
  @IsNotEmpty()
  operatorId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  hours!: number;
}

export class WorkOrderOperationToolDto {
  @IsString()
  @IsNotEmpty()
  machineToolId!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  hours!: number;
}

export class WorkOrderOperationConsumableDto {
  @IsOptional()
  @IsString()
  inventoryStockId?: string;

  @IsOptional()
  @IsString()
  item!: string;

  @IsOptional()
  @IsString()
  unitMeasure!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 3 })
  @Min(0.001)
  quantity!: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costUsd?: number;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costCup?: number;

  @IsOptional()
  @IsString()
  voucherNumber?: string;
}

export class WorkOrderOperationOutsourcedDto {
  @IsString()
  @IsNotEmpty()
  description!: string;

  @IsString()
  @IsNotEmpty()
  provider!: string;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costUsd!: number;

  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0)
  costCup!: number;
}

export class AddWorkOrderOperationDto {
  @IsString()
  @IsNotEmpty()
  operationCatalogId!: string;

  @IsDateString()
  operationDate!: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(0.01)
  hours?: number;

  @IsOptional()
  @IsString()
  notes?: string;

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderOperationWorkerDto)
  workers?: WorkOrderOperationWorkerDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderOperationToolDto)
  tools?: WorkOrderOperationToolDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderOperationConsumableDto)
  consumables?: WorkOrderOperationConsumableDto[];

  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WorkOrderOperationOutsourcedDto)
  outsourcedServices?: WorkOrderOperationOutsourcedDto[];
}
