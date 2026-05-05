import {
  IsString,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecordFormat, RecordCategory } from '../schemas/record.enum';

export class UpdateRecordInDto {
  @ApiPropertyOptional({ example: 'The Beatles' })
  @IsOptional()
  @IsString()
  artist?: string;

  @ApiPropertyOptional({ example: 'Abbey Road' })
  @IsOptional()
  @IsString()
  album?: string;

  @ApiPropertyOptional({ example: 25 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(10000)
  price?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(100000)
  qty?: number;

  @ApiPropertyOptional({ enum: RecordFormat })
  @IsOptional()
  @IsEnum(RecordFormat)
  format?: RecordFormat;

  @ApiPropertyOptional({ enum: RecordCategory })
  @IsOptional()
  @IsEnum(RecordCategory)
  category?: RecordCategory;

  @ApiPropertyOptional({ example: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d' })
  @IsOptional()
  @IsUUID('4')
  mbid?: string;
}
