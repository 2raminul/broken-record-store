export interface AppConfig {
  port: number;
  mongoUrl: string;
  redisUrl: string;
  musicBrainzBaseUrl: string;
  musicBrainzUserAgent: string;
  nodeEnv: string;
}
