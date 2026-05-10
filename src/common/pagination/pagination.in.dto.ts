import { ApiPropertyOptional } from "@nestjs/swagger";
import { Type } from "class-transformer";
import { IsInt, IsOptional, Max, Min } from "class-validator";

export class PaginationInDto {
  @ApiPropertyOptional({
    description: "Number of items to skip",
    default: 0,
    minimum: 0,
    maximum: 1_000_000,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  // Beyond 1M, prefer cursor/keyset pagination for performance
  @Max(1_000_000)
  offset: number = 0;

  @ApiPropertyOptional({
    description: "Items per page",
    default: 20,
    minimum: 1,
    maximum: 100,
  })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit: number = 20;
}
