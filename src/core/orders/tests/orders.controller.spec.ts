import { Test, TestingModule } from "@nestjs/testing";
import { OrdersController } from "../orders.controller";
import { OrdersService } from "../orders.service";
import { OrderStatus } from "../schemas/order.schema";
import { CreateOrderInDto } from "../dto/create-order.in.dto";
import { FindOrdersInDto } from "../dto/find-orders.in.dto";
import { OrderOutDto } from "../dto/order.out.dto";
import { PaginatedOutDto } from "../../../common/pagination/paginated.out.dto";

const mockOrder = (): OrderOutDto => ({
  id: "64a1f2b3c4d5e6f7a8b9c0d2",
  recordId: "64a1f2b3c4d5e6f7a8b9c0d1",
  qty: 2,
  unitPrice: 25,
  total: 50,
  status: OrderStatus.CONFIRMED,
  createdAt: new Date(),
});

describe("OrdersController", () => {
  let controller: OrdersController;
  let service: jest.Mocked<OrdersService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [OrdersController],
      providers: [
        {
          provide: OrdersService,
          useValue: {
            create: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(OrdersController);
    service = module.get(OrdersService);
  });

  describe("create", () => {
    it("delegates to service and returns the order", async () => {
      const dto: CreateOrderInDto = {
        recordId: "64a1f2b3c4d5e6f7a8b9c0d1",
        qty: 2,
      };
      const order = mockOrder();
      service.create.mockResolvedValue(order);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(order);
    });
  });

  describe("findAll", () => {
    it("delegates to service and returns paginated results", async () => {
      const query = new FindOrdersInDto();
      const paginated: PaginatedOutDto<OrderOutDto> = {
        data: [mockOrder()],
        paginationMetadata: { totalItemsAcrossAllPages: 1 },
      };
      service.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toBe(paginated);
    });
  });

  describe("findOne", () => {
    it("delegates to service and returns the order", async () => {
      const id = "64a1f2b3c4d5e6f7a8b9c0d2";
      const order = mockOrder();
      service.findOne.mockResolvedValue(order);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toBe(order);
    });
  });
});
