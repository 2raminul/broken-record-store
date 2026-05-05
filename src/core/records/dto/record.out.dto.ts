import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { RecordCategory, RecordFormat } from '../schemas/record.enum';
import { Track } from '../schemas/record.schema';

export class RecordOutDto {
  @ApiProperty() id!: string;
  @ApiProperty() artist!: string;
  @ApiProperty() album!: string;
  @ApiProperty() price!: number;
  @ApiProperty() qty!: number;
  @ApiProperty({ enum: RecordFormat }) format!: RecordFormat;
  @ApiProperty({ enum: RecordCategory }) category!: RecordCategory;
  @ApiPropertyOptional() mbid?: string;
  @ApiProperty({ isArray: true }) tracklist!: Track[];
  @ApiProperty() createdAt!: Date;
  @ApiProperty() updatedAt!: Date;
}
