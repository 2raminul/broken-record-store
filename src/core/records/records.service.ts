import {
  ConflictException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { CACHE_MANAGER } from "@nestjs/cache-manager";
import { Cache } from "cache-manager";
import { RecordsRepository } from "./records.repository";
import { MusicBrainzService } from "../integrations/music-brainz/music-brainz.service";
import { CreateRecordInDto } from "./dto/create-record.in.dto";
import { UpdateRecordInDto } from "./dto/update-record.in.dto";
import { FindRecordsInDto } from "./dto/find-records.in.dto";
import { Record, Track } from "./schemas/record.schema";
import {
  paginate,
  PaginatedOutDto,
} from "../../common/pagination/paginated.out.dto";
import { RecordOutDto } from "./dto/record.out.dto";

const RECORDS_LIST_CACHE_PREFIX = "records:list:";
const CACHE_TTL_MS = 60_000;

@Injectable()
export class RecordsService {
  private readonly logger = new Logger(RecordsService.name);

  constructor(
    private readonly recordsRepository: RecordsRepository,
    private readonly musicBrainzService: MusicBrainzService,
    @Inject(CACHE_MANAGER) private readonly cacheManager: Cache,
  ) {}

  async create(dto: CreateRecordInDto): Promise<RecordOutDto> {
    const tracklist = await this.fetchTracklist(dto.mbid);

    try {
      const record = await this.recordsRepository.create({ ...dto, tracklist });
      await this.invalidateListCache();
      return this.toOutDto(record);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException(
          "A record with the same artist, album, and format already exists",
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateRecordInDto): Promise<RecordOutDto> {
    const existing = await this.recordsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Record with id "${id}" not found`);
    }

    const updatePayload: Partial<Record> = { ...dto } as Partial<Record>;

    if (dto.mbid && dto.mbid !== existing.mbid) {
      updatePayload.tracklist = await this.fetchTracklist(dto.mbid);
      this.logger.log(
        { id, mbid: dto.mbid },
        "MBID changed — tracklist refreshed",
      );
    }

    let updated: Record | null;
    try {
      updated = await this.recordsRepository.findAndUpdate(id, updatePayload);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException(
          "A record with the same artist, album, and format already exists",
        );
      }
      throw err;
    }

    if (!updated) {
      throw new NotFoundException(`Record with id "${id}" not found`);
    }

    await this.invalidateListCache();
    return this.toOutDto(updated);
  }

  async findAll(
    filters: FindRecordsInDto,
  ): Promise<PaginatedOutDto<RecordOutDto>> {
    const cacheKey = this.buildListCacheKey(filters);
    const cached =
      await this.cacheManager.get<PaginatedOutDto<RecordOutDto>>(cacheKey);
    if (cached) return cached;

    const { records, total } =
      await this.recordsRepository.findWithFilters(filters);
    const result = paginate(
      records.map((r) => this.toOutDto(r)),
      total,
    );

    await this.cacheManager.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }

  async findOne(id: string): Promise<RecordOutDto> {
    const record = await this.recordsRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Record with id "${id}" not found`);
    }
    return this.toOutDto(record);
  }

  private buildListCacheKey(filters: FindRecordsInDto): string {
    const params = new URLSearchParams();
    if (filters.q) params.set("q", filters.q);
    if (filters.artist) params.set("artist", filters.artist);
    if (filters.album) params.set("album", filters.album);
    if (filters.format) params.set("format", filters.format);
    if (filters.category) params.set("category", filters.category);
    params.set("offset", String(filters.offset));
    params.set("limit", String(filters.limit));
    return `${RECORDS_LIST_CACHE_PREFIX}${params.toString()}`;
  }

  private async invalidateListCache(): Promise<void> {
    try {
      await this.cacheManager.clear();
    } catch (err) {
      this.logger.warn(
        { err },
        "Cache invalidation failed — stale data possible for up to 60s",
      );
    }
  }

  private async fetchTracklist(mbid?: string): Promise<Track[]> {
    if (!mbid) return [];
    const tracklist = await this.musicBrainzService.getTracklist(mbid);
    if (tracklist.length === 0) {
      this.logger.warn(
        { mbid },
        "MusicBrainz returned empty tracklist — record saved without tracks",
      );
    }
    return tracklist;
  }

  private toOutDto(record: Record): RecordOutDto {
    return {
      id: record.id as string,
      artist: record.artist,
      album: record.album,
      price: record.price,
      qty: record.qty,
      format: record.format,
      category: record.category,
      mbid: record.mbid,
      tracklist: record.tracklist,
      createdAt: record.createdAt,
      updatedAt: record.updatedAt,
    };
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      typeof err === "object" &&
      err !== null &&
      "code" in err &&
      (err as { code: number }).code === 11000
    );
  }
}
