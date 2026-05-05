import { Injectable, Logger } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { AppConfigService } from '../../../app-config/app-config.service';
import { firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 500;

@Injectable()
export class MusicBrainzClient {
  private readonly logger = new Logger(MusicBrainzClient.name);
  private readonly baseUrl: string;
  private readonly userAgent: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly appConfig: AppConfigService,
  ) {
    this.baseUrl = this.appConfig.get('musicBrainzBaseUrl');
    this.userAgent = this.appConfig.get('musicBrainzUserAgent');
  }

  async getReleaseXml(mbid: string): Promise<string | null> {
    const url = `${this.baseUrl}/release/${mbid}?inc=recordings&fmt=xml`;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await firstValueFrom(
          this.httpService.get<string>(url, {
            headers: {
              'User-Agent': this.userAgent,
              Accept: 'application/xml',
            },
            responseType: 'text',
            timeout: 5000,
          }),
        );
        return response.data;
      } catch (err: unknown) {
        const axiosErr = err as AxiosError;
        const status = axiosErr.response?.status;

        if (status === 404) {
          this.logger.warn({ mbid }, 'MusicBrainz: release not found');
          return null;
        }

        const isRetryable = !status || status >= 500;
        if (isRetryable && attempt < MAX_RETRIES) {
          const delay = RETRY_DELAY_MS * Math.pow(2, attempt - 1);
          this.logger.warn({ mbid, attempt, delay }, 'MusicBrainz: retrying after error');
          await this.sleep(delay);
          continue;
        }

        this.logger.error({ err, mbid, status }, 'MusicBrainz: request failed');
        return null;
      }
    }

    return null;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
