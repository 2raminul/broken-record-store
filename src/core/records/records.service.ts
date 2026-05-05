import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { RecordsRepository } from './records.repository';
import { MusicBrainzService } from '../integrations/music-brainz/music-brainz.service';
import { CreateRecordInDto } from './dto/create-record.in.dto';
import { UpdateRecordInDto } from './dto/update-record.in.dto';
import { FindRecordsInDto } from './dto/find-records.in.dto';
import { Record, Track } from './schemas/record.schema';
import { paginate, PaginatedOutDto } from '../../common/pagination/paginated.out.dto';
import { RecordOutDto } from './dto/record.out.dto';

@Injectable()
export class RecordsService {
  private readonly logger = new Logger(RecordsService.name);

  constructor(
    private readonly recordsRepository: RecordsRepository,
    private readonly musicBrainzService: MusicBrainzService,
  ) {}

  async create(dto: CreateRecordInDto): Promise<Record> {
    const tracklist = await this.fetchTracklist(dto.mbid);

    try {
      return await this.recordsRepository.create({ ...dto, tracklist });
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException(
          'A record with the same artist, album, and format already exists',
        );
      }
      throw err;
    }
  }

  async update(id: string, dto: UpdateRecordInDto): Promise<Record> {
    const existing = await this.recordsRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`Record with id "${id}" not found`);
    }

    const updatePayload: Partial<Record> = { ...dto } as Partial<Record>;

    if (dto.mbid && dto.mbid !== existing.mbid) {
      updatePayload.tracklist = await this.fetchTracklist(dto.mbid);
      this.logger.log({ id, mbid: dto.mbid }, 'MBID changed — tracklist refreshed');
    }

    let updated: Record | null;
    try {
      updated = await this.recordsRepository.findAndUpdate(id, updatePayload);
    } catch (err: unknown) {
      if (this.isDuplicateKeyError(err)) {
        throw new ConflictException(
          'A record with the same artist, album, and format already exists',
        );
      }
      throw err;
    }

    if (!updated) {
      throw new NotFoundException(`Record with id "${id}" not found`);
    }
    return updated;
  }

  async findAll(filters: FindRecordsInDto): Promise<PaginatedOutDto<RecordOutDto>> {
    const { records, total } = await this.recordsRepository.findWithFilters(filters);
    const dtos = records.map((r) => this.toOutDto(r));
    return paginate(dtos, total, filters.page, filters.limit);
  }

  async findOne(id: string): Promise<Record> {
    const record = await this.recordsRepository.findById(id);
    if (!record) {
      throw new NotFoundException(`Record with id "${id}" not found`);
    }
    return record;
  }

  private async fetchTracklist(mbid?: string): Promise<Track[]> {
    if (!mbid) return [];
    const tracklist = await this.musicBrainzService.getTracklist(mbid);
    if (tracklist.length === 0) {
      this.logger.warn({ mbid }, 'MusicBrainz returned empty tracklist — record saved without tracks');
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
      createdAt: (record as any).createdAt,
      updatedAt: (record as any).updatedAt,
    };
  }

  private isDuplicateKeyError(err: unknown): boolean {
    return (
      typeof err === 'object' &&
      err !== null &&
      'code' in err &&
      (err as { code: number }).code === 11000
    );
  }
}
