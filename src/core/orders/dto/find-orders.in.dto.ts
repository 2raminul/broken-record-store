import { IsMongoId, IsOptional } from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { PaginationInDto } from '../../../common/pagination/pagination.in.dto';

export class FindOrdersInDto extends PaginationInDto {
  @ApiPropertyOptional({ description: 'Filter by record ID' })
  @IsOptional()
  @IsMongoId()
  recordId?: string;
}
