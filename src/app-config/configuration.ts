import { AppConfig } from './app-config.interface';

export default (): AppConfig => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  mongoUrl: process.env.MONGO_URL ?? '',
  redisUrl: process.env.REDIS_URL ?? 'redis://localhost:6379',
  musicBrainzBaseUrl:
    process.env.MUSICBRAINZ_BASE_URL ?? 'https://musicbrainz.org/ws/2',
  musicBrainzUserAgent: process.env.MUSICBRAINZ_USER_AGENT ?? '',
  nodeEnv: process.env.NODE_ENV ?? 'development',
});
