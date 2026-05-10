import { Test, TestingModule } from "@nestjs/testing";
import { getModelToken } from "@nestjs/mongoose";
import { RecordsRepository } from "../records.repository";
import { Record } from "../schemas/record.schema";
import { RecordCategory, RecordFormat } from "../schemas/record.enum";
import { FindRecordsInDto } from "../dto/find-records.in.dto";

const mockRecord = (): Partial<Record> => ({
  id: "64a1f2b3c4d5e6f7a8b9c0d1",
  artist: "The Beatles",
  album: "Abbey Road",
  price: 25,
  qty: 10,
  format: RecordFormat.VINYL,
  category: RecordCategory.ROCK,
  tracklist: [],
});

const makeChain = (resolvedWith: unknown) => ({
  sort: jest.fn().mockReturnThis(),
  skip: jest.fn().mockReturnThis(),
  limit: jest.fn().mockReturnThis(),
  exec: jest.fn().mockResolvedValue(resolvedWith),
});

describe("RecordsRepository", () => {
  let repo: RecordsRepository;
  let model: {
    create: jest.Mock;
    findById: jest.Mock;
    findByIdAndUpdate: jest.Mock;
    find: jest.Mock;
    countDocuments: jest.Mock;
  };

  beforeEach(async () => {
    model = {
      create: jest.fn(),
      findById: jest.fn(),
      findByIdAndUpdate: jest.fn(),
      find: jest.fn(),
      countDocuments: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordsRepository,
        { provide: getModelToken(Record.name), useValue: model },
      ],
    }).compile();

    repo = module.get(RecordsRepository);
  });

  describe("create", () => {
    it("calls model.create and returns the record", async () => {
      const data = mockRecord();
      model.create.mockResolvedValue(data);

      const result = await repo.create(data);

      expect(model.create).toHaveBeenCalledWith(data);
      expect(result).toBe(data);
    });
  });

  describe("findById", () => {
    it("returns the record when found", async () => {
      const record = mockRecord();
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(record),
      });

      const result = await repo.findById("64a1f2b3c4d5e6f7a8b9c0d1");

      expect(model.findById).toHaveBeenCalledWith("64a1f2b3c4d5e6f7a8b9c0d1");
      expect(result).toBe(record);
    });

    it("returns null when not found", async () => {
      model.findById.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repo.findById("64a1f2b3c4d5e6f7a8b9c0d1");

      expect(result).toBeNull();
    });
  });

  describe("findAndUpdate", () => {
    it("returns the updated record", async () => {
      const updated = { ...mockRecord(), price: 30 };
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(updated),
      });

      const result = await repo.findAndUpdate("64a1f2b3c4d5e6f7a8b9c0d1", {
        price: 30,
      });

      expect(model.findByIdAndUpdate).toHaveBeenCalledWith(
        "64a1f2b3c4d5e6f7a8b9c0d1",
        { $set: { price: 30 } },
        { new: true, runValidators: true },
      );
      expect(result).toBe(updated);
    });

    it("returns null when the record does not exist", async () => {
      model.findByIdAndUpdate.mockReturnValue({
        exec: jest.fn().mockResolvedValue(null),
      });

      const result = await repo.findAndUpdate("64a1f2b3c4d5e6f7a8b9c0d1", {});

      expect(result).toBeNull();
    });
  });

  describe("findWithFilters", () => {
    it("returns records and total without filters", async () => {
      const records = [mockRecord()];
      model.find.mockReturnValue(makeChain(records));
      model.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(1),
      });

      const filters = new FindRecordsInDto();
      const result = await repo.findWithFilters(filters);

      expect(result).toEqual({ records, total: 1 });
      expect(model.find).toHaveBeenCalledWith({});
    });

    it("applies text search when q is set", async () => {
      model.find.mockReturnValue(makeChain([]));
      model.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const filters = Object.assign(new FindRecordsInDto(), { q: "Beatles" });
      await repo.findWithFilters(filters);

      expect(model.find).toHaveBeenCalledWith({
        $text: { $search: "Beatles" },
      });
    });

    it("applies format and category filters", async () => {
      model.find.mockReturnValue(makeChain([]));
      model.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const filters = Object.assign(new FindRecordsInDto(), {
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
      });
      await repo.findWithFilters(filters);

      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          format: RecordFormat.VINYL,
          category: RecordCategory.ROCK,
        }),
      );
    });

    it("applies artist and album regex filters", async () => {
      model.find.mockReturnValue(makeChain([]));
      model.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const filters = Object.assign(new FindRecordsInDto(), {
        artist: "Beatles",
        album: "Abbey",
      });
      await repo.findWithFilters(filters);

      expect(model.find).toHaveBeenCalledWith(
        expect.objectContaining({
          artist: expect.objectContaining({ $regex: "Beatles" }),
          album: expect.objectContaining({ $regex: "Abbey" }),
        }),
      );
    });

    it("skips by offset", async () => {
      model.find.mockReturnValue(makeChain([]));
      model.countDocuments.mockReturnValue({
        exec: jest.fn().mockResolvedValue(0),
      });

      const filters = Object.assign(new FindRecordsInDto(), {
        offset: 20,
        limit: 10,
      });
      await repo.findWithFilters(filters);

      const chain = model.find.mock.results[0].value;
      expect(chain.skip).toHaveBeenCalledWith(20);
      expect(chain.limit).toHaveBeenCalledWith(10);
    });
  });
});
