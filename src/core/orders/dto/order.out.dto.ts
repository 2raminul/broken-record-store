import { ApiProperty } from '@nestjs/swagger';
import { OrderStatus } from '../schemas/order.schema';

export class OrderOutDto {
  @ApiProperty() id!: string;
  @ApiProperty() recordId!: string;
  @ApiProperty() qty!: number;
  @ApiProperty() unitPrice!: number;
  @ApiProperty() total!: number;
  @ApiProperty({ enum: OrderStatus }) status!: OrderStatus;
  @ApiProperty() createdAt!: Date;
}
