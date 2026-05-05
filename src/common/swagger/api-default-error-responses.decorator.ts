import { applyDecorators } from '@nestjs/common';
import { ApiResponse } from '@nestjs/swagger';

export function ApiDefaultErrorResponses() {
  return applyDecorators(
    ApiResponse({ status: 400, description: 'Bad Request — validation failed' }),
    ApiResponse({ status: 404, description: 'Not Found' }),
    ApiResponse({ status: 409, description: 'Conflict — duplicate record' }),
    ApiResponse({ status: 422, description: 'Unprocessable Entity' }),
    ApiResponse({ status: 500, description: 'Internal Server Error' }),
  );
}
