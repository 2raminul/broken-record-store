import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { RecordsService } from "./records.service";
import { CreateRecordInDto } from "./dto/create-record.in.dto";
import { UpdateRecordInDto } from "./dto/update-record.in.dto";
import { FindRecordsInDto } from "./dto/find-records.in.dto";
import { RecordOutDto } from "./dto/record.out.dto";
import { PaginatedOutDto } from "../../common/pagination/paginated.out.dto";
import { ParseObjectIdPipe } from "../../common/pipes/parse-object-id.pipe";
import { ApiDefaultErrorResponses } from "../../common/swagger/api-default-error-responses.decorator";

@ApiTags("Records")
@Controller({ path: "records", version: "1" })
export class RecordsController {
  constructor(private readonly recordsService: RecordsService) {}

  @Post()
  @ApiOperation({ summary: "Create a new record" })
  @ApiResponse({
    status: 201,
    description: "Record created",
    type: RecordOutDto,
  })
  @ApiDefaultErrorResponses()
  create(@Body() dto: CreateRecordInDto): Promise<RecordOutDto> {
    return this.recordsService.create(dto);
  }

  @Put(":id")
  @ApiOperation({ summary: "Update a record" })
  @ApiResponse({
    status: 200,
    description: "Record updated",
    type: RecordOutDto,
  })
  @ApiDefaultErrorResponses()
  update(
    @Param("id", ParseObjectIdPipe) id: string,
    @Body() dto: UpdateRecordInDto,
  ): Promise<RecordOutDto> {
    return this.recordsService.update(id, dto);
  }

  @Get()
  @ApiOperation({
    summary: "List records with optional filters and pagination",
  })
  @ApiResponse({
    status: 200,
    description: "Paginated list",
    type: PaginatedOutDto,
  })
  @ApiDefaultErrorResponses()
  findAll(
    @Query() query: FindRecordsInDto,
  ): Promise<PaginatedOutDto<RecordOutDto>> {
    return this.recordsService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single record by ID" })
  @ApiResponse({ status: 200, description: "Record found", type: RecordOutDto })
  @ApiDefaultErrorResponses()
  findOne(@Param("id", ParseObjectIdPipe) id: string): Promise<RecordOutDto> {
    return this.recordsService.findOne(id);
  }
}
