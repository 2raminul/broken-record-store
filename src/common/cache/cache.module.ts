import { Module, Global } from '@nestjs/common';
import { CacheModule as NestCacheModule } from '@nestjs/cache-manager';
import { AppConfigService } from '../../app-config/app-config.service';

@Global()
@Module({
  imports: [
    NestCacheModule.registerAsync({
      inject: [AppConfigService],
      useFactory: async (config: AppConfigService) => {
        const redisUrl = config.get('redisUrl');
        if (!redisUrl || config.get('nodeEnv') === 'test') {
          return { ttl: 60_000 };
        }
        try {
          const { createClient } = await import('redis');
          const { redisInsStore } = await import('cache-manager-redis-yet');
          const client = createClient({ url: redisUrl });
          client.on('error', (err: unknown) => {
            console.warn('[CacheModule] Redis error — falling back to in-memory:', err);
          });
          await client.connect();
          return {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            store: await redisInsStore(client as any, { ttl: 60_000 }),
          };
        } catch {
          console.warn('[CacheModule] Redis unavailable — using in-memory cache');
          return { ttl: 60_000 };
        }
      },
    }),
  ],
  exports: [NestCacheModule],
})
export class AppCacheModule {}
