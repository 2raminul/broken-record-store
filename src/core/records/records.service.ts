import {
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { RecordsRepository } from './records.repository';
import { CreateRecordInDto } from './dto/create-record.in.dto';
import { UpdateRecordInDto } from './dto/update-record.in.dto';
import { FindRecordsInDto } from './dto/find-records.in.dto';
import { Record } from './schemas/record.schema';
import { paginate, PaginatedOutDto } from '../../common/pagination/paginated.out.dto';
import { RecordOutDto } from './dto/record.out.dto';

@Injectable()
export class RecordsService {
  constructor(private readonly recordsRepository: RecordsRepository) {}

  async create(dto: CreateRecordInDto): Promise<Record> {
    try {
      return await this.recordsRepository.create(dto);
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
    let updated: Record | null;
    try {
      updated = await this.recordsRepository.findAndUpdate(id, dto);
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
