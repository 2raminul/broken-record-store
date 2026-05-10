import { Test, TestingModule } from "@nestjs/testing";
import {
  NotFoundException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { getConnectionToken, getModelToken } from "@nestjs/mongoose";
import { OrdersService } from "../orders.service";
import { OrdersRepository } from "../orders.repository";
import { Record } from "../../records/schemas/record.schema";
import { Order, OrderStatus } from "../schemas/order.schema";
import {
  RecordFormat,
  RecordCategory,
} from "../../records/schemas/record.enum";

const mockRecord = {
  _id: "64a1f2b3c4d5e6f7a8b9c0d1",
  price: 25,
  qty: 10,
  artist: "The Beatles",
  album: "Abbey Road",
  format: RecordFormat.VINYL,
  category: RecordCategory.ROCK,
};

const mockOrder = {
  id: "64a1f2b3c4d5e6f7a8b9c0d2",
  recordId: "64a1f2b3c4d5e6f7a8b9c0d1",
  qty: 2,
  unitPrice: 25,
  total: 50,
  status: OrderStatus.CONFIRMED,
  createdAt: new Date(),
};

const mockSession = {
  startTransaction: jest.fn(),
  commitTransaction: jest.fn(),
  abortTransaction: jest.fn(),
  endSession: jest.fn(),
};

describe("OrdersService", () => {
  let service: OrdersService;
  let ordersRepo: jest.Mocked<OrdersRepository>;
  let recordModel: {
    findOneAndUpdate: jest.Mock;
    exists: jest.Mock;
  };
  let connection: { startSession: jest.Mock };

  beforeEach(async () => {
    recordModel = {
      findOneAndUpdate: jest.fn(),
      exists: jest.fn(),
    };
    connection = { startSession: jest.fn().mockResolvedValue(mockSession) };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: OrdersRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findWithFilters: jest.fn(),
          },
        },
        { provide: getModelToken(Record.name), useValue: recordModel },
        { provide: getConnectionToken(), useValue: connection },
      ],
    }).compile();

    service = module.get(OrdersService);
    ordersRepo = module.get(OrdersRepository);
  });

  afterEach(() => jest.clearAllMocks());

  describe("create", () => {
    it("creates an order and decrements stock atomically", async () => {
      recordModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(mockRecord),
      });
      ordersRepo.create.mockResolvedValue(mockOrder as unknown as Order);

      const result = await service.create({
        recordId: "64a1f2b3c4d5e6f7a8b9c0d1",
        qty: 2,
      });

      expect(mockSession.commitTransaction).toHaveBeenCalled();
      expect(mockSession.abortTransaction).not.toHaveBeenCalled();
      expect(result.qty).toBe(2);
      expect(result.total).toBe(50);
    });

    it("throws 422 when stock is insufficient", async () => {
      recordModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      recordModel.exists.mockReturnValue({
        session: jest
          .fn()
          .mockResolvedValue({ _id: "64a1f2b3c4d5e6f7a8b9c0d1" }),
      });

      await expect(
        service.create({ recordId: "64a1f2b3c4d5e6f7a8b9c0d1", qty: 999 }),
      ).rejects.toThrow(UnprocessableEntityException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });

    it("throws 404 when record does not exist", async () => {
      recordModel.findOneAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });
      recordModel.exists.mockReturnValue({
        session: jest.fn().mockResolvedValue(null),
      });

      await expect(
        service.create({ recordId: "64a1f2b3c4d5e6f7a8b9c0d1", qty: 1 }),
      ).rejects.toThrow(NotFoundException);

      expect(mockSession.abortTransaction).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when order is missing", async () => {
      ordersRepo.findById.mockResolvedValue(null);
      await expect(service.findOne("64a1f2b3c4d5e6f7a8b9c0d2")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
