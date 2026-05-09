import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { ClientSession, FilterQuery, Model, Types } from "mongoose";
import { Order } from "./schemas/order.schema";
import { FindOrdersInDto } from "./dto/find-orders.in.dto";

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectModel(Order.name) private readonly orderModel: Model<Order>,
  ) {}

  async create(
    data: {
      recordId: Types.ObjectId;
      qty: number;
      unitPrice: number;
      total: number;
    },
    session: ClientSession,
  ): Promise<Order> {
    const [order] = await this.orderModel.create([data], { session });
    return order;
  }

  async findById(id: string): Promise<Order | null> {
    return this.orderModel.findById(id).populate("recordId").exec();
  }

  async findWithFilters(
    filters: FindOrdersInDto,
  ): Promise<{ orders: Order[]; total: number }> {
    const query: FilterQuery<Order> = {};
    if (filters.recordId) {
      query.recordId = new Types.ObjectId(filters.recordId);
    }

    const { offset, limit } = filters;
    const skip = offset;

    const [orders, total] = await Promise.all([
      this.orderModel
        .find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.orderModel.countDocuments(query).exec(),
    ]);

    return { orders, total };
  }
}
