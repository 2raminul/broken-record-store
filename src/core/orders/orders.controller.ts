import { Body, Controller, Get, Param, Post, Query } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { OrdersService } from "./orders.service";
import { CreateOrderInDto } from "./dto/create-order.in.dto";
import { OrderOutDto } from "./dto/order.out.dto";
import { FindOrdersInDto } from "./dto/find-orders.in.dto";
import { PaginatedOutDto } from "../../common/pagination/paginated.out.dto";
import { ParseObjectIdPipe } from "../../common/pipes/parse-object-id.pipe";
import { ApiDefaultErrorResponses } from "../../common/swagger/api-default-error-responses.decorator";

@ApiTags("Orders")
@Controller({ path: "orders", version: "1" })
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post()
  @ApiOperation({ summary: "Create an order (atomically decrements stock)" })
  @ApiResponse({ status: 201, description: "Order created", type: OrderOutDto })
  @ApiDefaultErrorResponses()
  create(@Body() dto: CreateOrderInDto): Promise<OrderOutDto> {
    return this.ordersService.create(dto);
  }

  @Get()
  @ApiOperation({ summary: "List orders with optional recordId filter" })
  @ApiResponse({ status: 200, type: PaginatedOutDto })
  @ApiDefaultErrorResponses()
  findAll(
    @Query() query: FindOrdersInDto,
  ): Promise<PaginatedOutDto<OrderOutDto>> {
    return this.ordersService.findAll(query);
  }

  @Get(":id")
  @ApiOperation({ summary: "Get a single order by ID" })
  @ApiResponse({ status: 200, type: OrderOutDto })
  @ApiDefaultErrorResponses()
  findOne(@Param("id", ParseObjectIdPipe) id: string): Promise<OrderOutDto> {
    return this.ordersService.findOne(id);
  }
}
