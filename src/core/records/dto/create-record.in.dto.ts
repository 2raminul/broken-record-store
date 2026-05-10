import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsEnum,
  IsOptional,
  IsUUID,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecordFormat, RecordCategory } from '../schemas/record.enum';

export class CreateRecordInDto {
  @ApiProperty({ example: 'The Beatles' })
  @IsString()
  @IsNotEmpty()
  artist!: string;

  @ApiProperty({ example: 'Abbey Road' })
  @IsString()
  @IsNotEmpty()
  album!: string;

  @ApiProperty({ example: 25, minimum: 0, maximum: 10000 })
  @IsNumber()
  @Min(0)
  @Max(10000)
  price!: number;

  @ApiProperty({ example: 10, minimum: 0, maximum: 100000 })
  @IsInt()
  @Min(0)
  @Max(100000)
  qty!: number;

  @ApiProperty({ enum: RecordFormat, example: RecordFormat.VINYL })
  @IsEnum(RecordFormat)
  format!: RecordFormat;

  @ApiProperty({ enum: RecordCategory, example: RecordCategory.ROCK })
  @IsEnum(RecordCategory)
  category!: RecordCategory;

  @ApiPropertyOptional({ example: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d' })
  @IsOptional()
  @IsUUID('4')
  mbid?: string;
}
