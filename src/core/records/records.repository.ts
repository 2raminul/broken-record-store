import { Injectable } from "@nestjs/common";
import { InjectModel } from "@nestjs/mongoose";
import { FilterQuery, Model } from "mongoose";
import { Record } from "./schemas/record.schema";
import { FindRecordsInDto } from "./dto/find-records.in.dto";
import { escapeRegex } from "../../common/utils/escape-regex";

@Injectable()
export class RecordsRepository {
  constructor(
    @InjectModel(Record.name) private readonly recordModel: Model<Record>,
  ) {}

  async create(data: Partial<Record>): Promise<Record> {
    return this.recordModel.create(data);
  }

  async findById(id: string): Promise<Record | null> {
    return this.recordModel.findById(id).exec();
  }

  async findAndUpdate(
    id: string,
    update: Partial<Record>,
  ): Promise<Record | null> {
    return this.recordModel
      .findByIdAndUpdate(
        id,
        { $set: update },
        { new: true, runValidators: true },
      )
      .exec();
  }

  async findWithFilters(
    filters: FindRecordsInDto,
  ): Promise<{ records: Record[]; total: number }> {
    const query = this.buildFilterQuery(filters);
    const { offset, limit } = filters;
    const skip = offset;

    const [records, total] = await Promise.all([
      this.recordModel
        .find(query)
        .sort(filters.q ? { score: { $meta: "textScore" } } : { createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .exec(),
      this.recordModel.countDocuments(query).exec(),
    ]);

    return { records, total };
  }

  private buildFilterQuery(filters: FindRecordsInDto): FilterQuery<Record> {
    const query: FilterQuery<Record> = {};

    if (filters.q) {
      query.$text = { $search: filters.q };
    }

    if (filters.artist) {
      query.artist = { $regex: escapeRegex(filters.artist), $options: "i" };
    }

    if (filters.album) {
      query.album = { $regex: escapeRegex(filters.album), $options: "i" };
    }

    if (filters.format) {
      query.format = filters.format;
    }

    if (filters.category) {
      query.category = filters.category;
    }

    return query;
  }
}
