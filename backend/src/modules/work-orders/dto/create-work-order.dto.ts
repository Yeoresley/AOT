import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  establishmentId!: string;

  @IsString()
  @IsNotEmpty()
  clientId!: string;

  @IsString()
  @IsNotEmpty()
  vehicleId!: string;

  @IsString()
  @IsNotEmpty()
  deliveredBy!: string;

  @IsString()
  @IsNotEmpty()
  receivedBy!: string;

  @IsDateString()
  receivedAt!: string;

  @IsString()
  @IsNotEmpty()
  requestedActivity!: string;

  @IsString()
  vehicleConditionNotes!: string;

  @IsString()
  visibleIncidents!: string;

  @IsString()
  initialTraceability!: string;
}
