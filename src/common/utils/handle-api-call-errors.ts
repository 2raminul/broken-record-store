import {
  HttpException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { AxiosError } from 'axios';

const logger = new Logger('handleApiCallErrors');

export async function handleApiCallErrors<T>(
  fn: () => Promise<T>,
  options?: { httpStatusesToProxy?: number[] },
): Promise<T> {
  try {
    return await fn();
  } catch (err: unknown) {
    if (err instanceof HttpException) throw err;

    const axiosError = err as AxiosError;
    const status = axiosError.response?.status;

    if (status && options?.httpStatusesToProxy?.includes(status)) {
      throw new HttpException(axiosError.message, status);
    }

    logger.error({ err, status }, 'External API call failed');
    throw new InternalServerErrorException('External service error');
  }
}
