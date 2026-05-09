import { ApiProperty } from "@nestjs/swagger";

export class PaginationMetadata {
  @ApiProperty() totalItemsAcrossAllPages!: number;
}

export class PaginatedOutDto<T> {
  @ApiProperty({ isArray: true })
  data!: T[];

  @ApiProperty({ type: () => PaginationMetadata })
  paginationMetadata!: PaginationMetadata;
}

export function paginate<T>(data: T[], total: number): PaginatedOutDto<T> {
  return {
    data,
    paginationMetadata: { totalItemsAcrossAllPages: total },
  };
}
