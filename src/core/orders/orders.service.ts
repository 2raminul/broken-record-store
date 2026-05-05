import {
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { InjectConnection, InjectModel } from '@nestjs/mongoose';
import { Connection, Model, Types } from 'mongoose';
import { OrdersRepository } from './orders.repository';
import { Record } from '../records/schemas/record.schema';
import { Order } from './schemas/order.schema';
import { CreateOrderInDto } from './dto/create-order.in.dto';
import { FindOrdersInDto } from './dto/find-orders.in.dto';
import { OrderOutDto } from './dto/order.out.dto';
import { paginate, PaginatedOutDto } from '../../common/pagination/paginated.out.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly ordersRepository: OrdersRepository,
    @InjectModel(Record.name) private readonly recordModel: Model<Record>,
    @InjectConnection() private readonly connection: Connection,
  ) {}

  async create(dto: CreateOrderInDto): Promise<Order> {
    const recordObjectId = new Types.ObjectId(dto.recordId);

    const session = await this.connection.startSession();
    try {
      session.startTransaction();

      const updatedRecord = await this.recordModel
        .findOneAndUpdate(
          { _id: recordObjectId, qty: { $gte: dto.qty } },
          { $inc: { qty: -dto.qty } },
          { new: true, session },
        )
        .exec();

      if (!updatedRecord) {
        const exists = await this.recordModel.exists({ _id: recordObjectId }).session(session);
        if (!exists) {
          throw new NotFoundException(`Record with id "${dto.recordId}" not found`);
        }
        throw new UnprocessableEntityException(
          'Insufficient stock — the requested quantity exceeds available inventory',
        );
      }

      const order = await this.ordersRepository.create(
        {
          recordId: recordObjectId,
          qty: dto.qty,
          unitPrice: updatedRecord.price,
          total: updatedRecord.price * dto.qty,
        },
        session,
      );

      await session.commitTransaction();
      return order;
    } catch (err) {
      await session.abortTransaction();
      throw err;
    } finally {
      await session.endSession();
    }
  }

  async findOne(id: string): Promise<Order> {
    const order = await this.ordersRepository.findById(id);
    if (!order) {
      throw new NotFoundException(`Order with id "${id}" not found`);
    }
    return order;
  }

  async findAll(filters: FindOrdersInDto): Promise<PaginatedOutDto<OrderOutDto>> {
    const { orders, total } = await this.ordersRepository.findWithFilters(filters);
    const dtos = orders.map((o) => this.toOutDto(o));
    return paginate(dtos, total, filters.page, filters.limit);
  }

  private toOutDto(order: Order): OrderOutDto {
    return {
      id: order.id as string,
      recordId: order.recordId.toString(),
      qty: order.qty,
      unitPrice: order.unitPrice,
      total: order.total,
      status: order.status,
      createdAt: (order as any).createdAt,
    };
  }
}
