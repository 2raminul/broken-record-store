import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AppConfig } from './app-config.interface';

@Injectable()
export class AppConfigService {
  constructor(private readonly configService: ConfigService<AppConfig, true>) {}

  get<K extends keyof AppConfig>(key: K): AppConfig[K] {
    return this.configService.get(key, { infer: true });
  }
}
