import { Type } from 'class-transformer';
import { IsDateString, IsIn, IsNotEmpty, IsNumber, IsOptional, IsString, Min } from 'class-validator';

export class IssueInvoicesDto {
  @IsOptional()
  @IsDateString()
  dueDate?: string;
}

export class RecordPaymentDto {
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 4 })
  @Min(0.0001)
  amount!: number;

  @IsString()
  @IsNotEmpty()
  @IsIn(['CASH', 'TRANSFER', 'CARD', 'OTHER'])
  paymentMethod!: string;

  @IsOptional()
  @IsString()
  reference?: string;
}
