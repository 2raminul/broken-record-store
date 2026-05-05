import { IsEnum, IsOptional, IsString } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { RecordCategory, RecordFormat } from '../schemas/record.enum';
import { PaginationInDto } from '../../../common/pagination/pagination.in.dto';

export class FindRecordsInDto extends PaginationInDto {
  @ApiPropertyOptional({ description: 'Full-text search across artist and album' })
  @IsOptional()
  @IsString()
  q?: string;

  @ApiPropertyOptional({ example: 'The Beatles' })
  @IsOptional()
  @IsString()
  artist?: string;

  @ApiPropertyOptional({ example: 'Abbey Road' })
  @IsOptional()
  @IsString()
  album?: string;

  @ApiPropertyOptional({ enum: RecordFormat })
  @IsOptional()
  @IsEnum(RecordFormat)
  format?: RecordFormat;

  @ApiPropertyOptional({ enum: RecordCategory })
  @IsOptional()
  @IsEnum(RecordCategory)
  category?: RecordCategory;
}
