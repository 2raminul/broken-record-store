import { Test, TestingModule } from "@nestjs/testing";
import { RecordsController } from "../records.controller";
import { RecordsService } from "../records.service";
import { RecordCategory, RecordFormat } from "../schemas/record.enum";
import { CreateRecordInDto } from "../dto/create-record.in.dto";
import { UpdateRecordInDto } from "../dto/update-record.in.dto";
import { FindRecordsInDto } from "../dto/find-records.in.dto";
import { RecordOutDto } from "../dto/record.out.dto";
import { PaginatedOutDto } from "../../../common/pagination/paginated.out.dto";

const mockRecord = (): RecordOutDto => ({
  id: "64a1f2b3c4d5e6f7a8b9c0d1",
  artist: "The Beatles",
  album: "Abbey Road",
  price: 25,
  qty: 10,
  format: RecordFormat.VINYL,
  category: RecordCategory.ROCK,
  tracklist: [],
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe("RecordsController", () => {
  let controller: RecordsController;
  let service: jest.Mocked<RecordsService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RecordsController],
      providers: [
        {
          provide: RecordsService,
          useValue: {
            create: jest.fn(),
            update: jest.fn(),
            findAll: jest.fn(),
            findOne: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(RecordsController);
    service = module.get(RecordsService);
  });

  describe("create", () => {
    it("delegates to service and returns the result", async () => {
      const dto: CreateRecordInDto = {
        artist: "The Beatles",
        album: "Abbey Road",
        price: 25,
        qty: 10,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      };
      const record = mockRecord();
      service.create.mockResolvedValue(record);

      const result = await controller.create(dto);

      expect(service.create).toHaveBeenCalledWith(dto);
      expect(result).toBe(record);
    });
  });

  describe("update", () => {
    it("delegates to service and returns the updated record", async () => {
      const id = "64a1f2b3c4d5e6f7a8b9c0d1";
      const dto: UpdateRecordInDto = { price: 30 };
      const updated = { ...mockRecord(), price: 30 };
      service.update.mockResolvedValue(updated);

      const result = await controller.update(id, dto);

      expect(service.update).toHaveBeenCalledWith(id, dto);
      expect(result).toBe(updated);
    });
  });

  describe("findAll", () => {
    it("delegates to service and returns paginated results", async () => {
      const query = new FindRecordsInDto();
      const paginated: PaginatedOutDto<RecordOutDto> = {
        data: [mockRecord()],
        paginationMetadata: { totalItemsAcrossAllPages: 1 },
      };
      service.findAll.mockResolvedValue(paginated);

      const result = await controller.findAll(query);

      expect(service.findAll).toHaveBeenCalledWith(query);
      expect(result).toBe(paginated);
    });
  });

  describe("findOne", () => {
    it("delegates to service and returns the record", async () => {
      const id = "64a1f2b3c4d5e6f7a8b9c0d1";
      const record = mockRecord();
      service.findOne.mockResolvedValue(record);

      const result = await controller.findOne(id);

      expect(service.findOne).toHaveBeenCalledWith(id);
      expect(result).toBe(record);
    });
  });
});
