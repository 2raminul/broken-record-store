import {
  RecordCategory,
  RecordFormat,
} from "../../src/core/records/schemas/record.enum";
import { CreateRecordInDto } from "../../src/core/records/dto/create-record.in.dto";

export function makeRecord(
  overrides: Partial<CreateRecordInDto> = {},
): CreateRecordInDto {
  return {
    artist: "Test Artist",
    album: "Test Album",
    price: 20,
    qty: 10,
    format: RecordFormat.VINYL,
    category: RecordCategory.ROCK,
    ...overrides,
  };
}
