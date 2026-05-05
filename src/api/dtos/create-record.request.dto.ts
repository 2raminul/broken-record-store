import {
  IsString,
  IsNotEmpty,
  IsNumber,
  Min,
  Max,
  IsInt,
  IsEnum,
  IsOptional,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RecordFormat, RecordCategory } from '../schemas/record.enum';

export class CreateRecordRequestDTO {
  @ApiProperty({ description: 'Artist of the record', example: 'The Beatles' })
  @IsString()
  @IsNotEmpty()
  artist!: string;

  @ApiProperty({ description: 'Album name', example: 'Abbey Road' })
  @IsString()
  @IsNotEmpty()
  album!: string;

  @ApiProperty({ description: 'Price of the record', example: 30 })
  @IsNumber()
  @Min(0)
  @Max(10000)
  price!: number;

  @ApiProperty({ description: 'Quantity in stock', example: 10 })
  @IsInt()
  @Min(0)
  @Max(100000)
  qty!: number;

  @ApiProperty({ description: 'Format', enum: RecordFormat, example: RecordFormat.VINYL })
  @IsEnum(RecordFormat)
  @IsNotEmpty()
  format!: RecordFormat;

  @ApiProperty({ description: 'Category', enum: RecordCategory, example: RecordCategory.ROCK })
  @IsEnum(RecordCategory)
  @IsNotEmpty()
  category!: RecordCategory;

  @ApiProperty({ description: 'MusicBrainz ID', example: 'b10bbbfc-cf9e-42e0-be17-e2c3e1d2600d', required: false })
  @IsOptional()
  mbid?: string;
}
