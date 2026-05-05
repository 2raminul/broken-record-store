import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsMongoId, Min } from 'class-validator';

export class CreateOrderInDto {
  @ApiProperty({ description: 'Record ID to order', example: '64a1f2b3c4d5e6f7a8b9c0d1' })
  @IsMongoId()
  recordId!: string;

  @ApiProperty({ description: 'Quantity to order', example: 2, minimum: 1 })
  @IsInt()
  @Min(1)
  qty!: number;
}
