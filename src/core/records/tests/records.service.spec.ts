import { Test, TestingModule } from "@nestjs/testing";
import { ConflictException, NotFoundException } from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { RecordsService } from "../records.service";
import { RecordsRepository } from "../records.repository";
import { MusicBrainzService } from "../../integrations/music-brainz/music-brainz.service";
import { RecordCategory, RecordFormat } from "../schemas/record.enum";
import { CreateRecordInDto } from "../dto/create-record.in.dto";
import { UpdateRecordInDto } from "../dto/update-record.in.dto";
import { FindRecordsInDto } from "../dto/find-records.in.dto";
import { Record } from "../schemas/record.schema";

const mockRecord = (overrides: Partial<Record> = {}): Partial<Record> =>
  ({
    id: "64a1f2b3c4d5e6f7a8b9c0d1",
    artist: "The Beatles",
    album: "Abbey Road",
    price: 25,
    qty: 10,
    format: RecordFormat.VINYL,
    category: RecordCategory.ROCK,
    mbid: "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
    tracklist: [],
    ...overrides,
  }) as Partial<Record>;

describe("RecordsService", () => {
  let service: RecordsService;
  let repo: jest.Mocked<RecordsRepository>;
  let mbService: jest.Mocked<MusicBrainzService>;
  let cache: { get: jest.Mock; set: jest.Mock; clear: jest.Mock };

  beforeEach(async () => {
    cache = {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn(),
      clear: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecordsService,
        {
          provide: RecordsRepository,
          useValue: {
            create: jest.fn(),
            findById: jest.fn(),
            findAndUpdate: jest.fn(),
            findWithFilters: jest.fn(),
          },
        },
        {
          provide: MusicBrainzService,
          useValue: { getTracklist: jest.fn().mockResolvedValue([]) },
        },
        { provide: CACHE_MANAGER, useValue: cache },
      ],
    }).compile();

    service = module.get(RecordsService);
    repo = module.get(RecordsRepository);
    mbService = module.get(MusicBrainzService);
  });

  describe("create", () => {
    it("creates a record and returns it", async () => {
      const dto: CreateRecordInDto = {
        artist: "The Beatles",
        album: "Abbey Road",
        price: 25,
        qty: 10,
        format: RecordFormat.VINYL,
        category: RecordCategory.ROCK,
        mbid: "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
      };
      const created = mockRecord();
      repo.create.mockResolvedValue(created as Record);

      const result = await service.create(dto);

      expect(mbService.getTracklist).toHaveBeenCalledWith(dto.mbid);
      expect(repo.create).toHaveBeenCalledWith(
        expect.objectContaining({ tracklist: [] }),
      );
      expect(result).toEqual(created);
    });

    it("throws ConflictException on duplicate key error", async () => {
      repo.create.mockRejectedValue({ code: 11000 });
      await expect(
        service.create({
          artist: "X",
          album: "Y",
          price: 10,
          qty: 1,
          format: RecordFormat.CD,
          category: RecordCategory.JAZZ,
        }),
      ).rejects.toThrow(ConflictException);
    });

    it("does not call MusicBrainz when mbid is absent", async () => {
      repo.create.mockResolvedValue(mockRecord({ mbid: undefined }) as Record);
      await service.create({
        artist: "X",
        album: "Y",
        price: 10,
        qty: 1,
        format: RecordFormat.CD,
        category: RecordCategory.JAZZ,
      });
      expect(mbService.getTracklist).not.toHaveBeenCalled();
    });
  });

  describe("update", () => {
    it("re-fetches tracklist when mbid changes", async () => {
      const existing = mockRecord({ mbid: "old-mbid" });
      const updated = mockRecord({
        mbid: "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
      });
      repo.findById.mockResolvedValue(existing as Record);
      repo.findAndUpdate.mockResolvedValue(updated as Record);

      const dto: UpdateRecordInDto = {
        mbid: "b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d",
      };
      await service.update("64a1f2b3c4d5e6f7a8b9c0d1", dto);

      expect(mbService.getTracklist).toHaveBeenCalledWith(dto.mbid);
    });

    it("skips MusicBrainz when mbid is unchanged", async () => {
      const existing = mockRecord();
      repo.findById.mockResolvedValue(existing as Record);
      repo.findAndUpdate.mockResolvedValue(existing as Record);

      await service.update("64a1f2b3c4d5e6f7a8b9c0d1", { price: 30 });
      expect(mbService.getTracklist).not.toHaveBeenCalled();
    });

    it("throws NotFoundException when record does not exist", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(
        service.update("64a1f2b3c4d5e6f7a8b9c0d1", { price: 30 }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("findAll", () => {
    it("returns cached result on cache hit", async () => {
      const cached = {
        data: [],
        meta: { page: 1, limit: 20, total: 0, totalPages: 0 },
      };
      cache.get.mockResolvedValue(cached);

      const filters = new FindRecordsInDto();
      const result = await service.findAll(filters);

      expect(repo.findWithFilters).not.toHaveBeenCalled();
      expect(result).toEqual(cached);
    });

    it("queries DB and caches on cache miss", async () => {
      repo.findWithFilters.mockResolvedValue({ records: [], total: 0 });

      const filters = new FindRecordsInDto();
      await service.findAll(filters);

      expect(repo.findWithFilters).toHaveBeenCalled();
      expect(cache.set).toHaveBeenCalled();
    });
  });

  describe("findOne", () => {
    it("throws NotFoundException when record is missing", async () => {
      repo.findById.mockResolvedValue(null);
      await expect(service.findOne("64a1f2b3c4d5e6f7a8b9c0d1")).rejects.toThrow(
        NotFoundException,
      );
    });
  });
});
