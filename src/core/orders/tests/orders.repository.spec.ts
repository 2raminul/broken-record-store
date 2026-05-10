import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { Types } from "mongoose";
import { OrdersRepository } from "../orders.repository";
import { Order, OrderStatus } from "../schemas/order.schema";
import { FindOrdersInDto } from "../dto/find-orders.in.dto";

const recordObjectId = new Types.ObjectId("64a1f2b3c4d5e6f7a8b9c0d1");

const mockOrder = (): Partial<Order> => ({
  id: "64a1f2b3c4d5e6f7a8b9c0d2",
  recordId: recordObjectId,
  qty: 2,
  unitPrice: 25,
  total: 50,
  status: OrderStatus.CONFIRMED,
  createdAt: new Date(),
});

const makeChain = (resolvedWith: unknown) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(resolvedWith),
});

const mockSession = {};

describe("OrdersRepository", () => {
  let repo: OrdersRepository;
  let model: {
    create: jest.Mock;
    findById: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      findById: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersRepository,
        { provide: getModelToken(Order.name), useValue: model },
      ],
    }).compile();

    repo = module.get(OrdersRepository);
  });

  describe("create", () => {
    it("creates the order within the session and returns it", async () => {
      const order = mockOrder();
      model.create.mockResolvedValue([order]);

      const result = await repo.create(
        {
          recordId: recordObjectId,
          qty: 2,
          unitPrice: 25,
          total: 50,
        },
        mockSession as any,
      );

      expect(model.create).toHaveBeenCalledWith(
        [{ recordId: recordObjectId, qty: 2, unitPrice: 25, total: 50 }],
        { session: mockSession },
      );
      expect(result).toBe(order);
    });
  });

  describe("findById", () => {
    it("returns the order when found", async () => {
      const order = mockOrder();
      model.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(order),
        }),
      });

      const result = await repo.findById("64a1f2b3c4d5e6f7a8b9c0d2");

      expect(model.findById).toHaveBeenCalledWith("64a1f2b3c4d5e6f7a8b9c0d2");
      expect(result).toBe(order);
    });

    it("returns null when not found", async () => {
      model.findById.mockReturnValue({
        populate: jest.fn().mockReturnValue({
          exec: jest.fn().mockResolvedValue(null),
        }),
      });

      const result = await repo.findById("64a1f2b3c4d5e6f7a8b9c0d2");

      expect(result).toBeNull();
    });
  });

  describe("findWithFilters", () => {
    it("returns orders and total without filters", async () => {
      const orders = [mockOrder()];
      model.find.mockReturnValue(makeChain(orders));
      model.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const filters = new FindOrdersInDto();
      const result = await repo.findWithFilters(filters);

      expect(result).toEqual({ orders, total: 1 });
      expect(model.find).toHaveBeenCalledWith({});
    });

    it("filters by recordId when provided", async () => {
      model.find.mockReturnValue(makeChain([]));
      model.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const filters = Object.assign(new FindOrdersInDto(), {
        recordId: "64a1f2b3c4d5e6f7a8b9c0d1",
      });
      await repo.findWithFilters(filters);

      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({ recordId: expect.any(Types.ObjectId) }),
      );
    });

    it("skips by offset", async () => {
      model.find.mockReturnValue(makeChain([]));
      model.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const filters = Object.assign(new FindOrdersInDto(), {
        offset: 10,
        limit: 5,
      });
      await repo.findWithFilters(filters);

      const chain = model.find.mock.results[0].value;
      expect(chain.skip).toHaveBeenCalledWith(10);
      expect(chain.limit).toHaveBeenCalledWith(5);
    });
  });
});
