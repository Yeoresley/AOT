import { IsDateString, IsNotEmpty, IsString } from 'class-validator';

export class CreateWorkOrderDto {
  @IsString()
  establishmentId!: string;

  @IsString()
  clientId!: string;

  @IsString()
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
  requestedActivity!: string;

  @IsString()
  vehicleConditionNotes!: string;

  @IsString()
  visibleIncidents!: string;

  @IsString()
  initialTraceability!: string;
}
