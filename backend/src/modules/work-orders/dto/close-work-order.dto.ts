import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CloseWorkOrderDto {
  @IsString()
  @IsNotEmpty()
  releasedTo!: string;

  @IsOptional()
  @IsString()
  deliveryNotes?: string;
}
