import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose";
import { Document, Types } from "mongoose";

export enum OrderStatus {
  CONFIRMED = "CONFIRMED",
}

@Schema({ timestamps: true })
export class Order extends Document {
  @Prop({ type: Types.ObjectId, ref: "Record", required: true, index: true })
  recordId!: Types.ObjectId;

  @Prop({ required: true, min: 1 })
  qty!: number;

  @Prop({ required: true, min: 0 })
  unitPrice!: number;

  @Prop({ required: true, min: 0 })
  total!: number;

  @Prop({ enum: OrderStatus, default: OrderStatus.CONFIRMED })
  status!: OrderStatus;

  createdAt!: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);
OrderSchema.index({ createdAt: -1 });
