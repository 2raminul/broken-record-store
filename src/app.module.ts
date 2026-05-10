import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ThrottlerModule } from '@nestjs/throttler';
import { AppConfigModule } from './app-config/app-config.module';
import { AppConfigService } from './app-config/app-config.service';
import { AppCacheModule } from './common/cache/cache.module';
import { HealthModule } from './health/health.module';
import { RecordsModule } from './core/records/records.module';
import { OrdersModule } from './core/orders/orders.module';

@Module({
  imports: [
    AppConfigModule,
    MongooseModule.forRootAsync({
      inject: [AppConfigService],
      useFactory: (config: AppConfigService) => ({
        uri: config.get('mongoUrl'),
      }),
    }),
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    AppCacheModule,
    HealthModule,
    RecordsModule,
    OrdersModule,
  ],
})
export class AppModule {}
