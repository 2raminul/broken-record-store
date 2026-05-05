import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { customizeApp } from './app.customizer';
import { AppConfigService } from './app-config/app-config.service';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, { bufferLogs: true });

  customizeApp(app);

  const appConfig = app.get(AppConfigService);
  await app.listen(appConfig.get('port'));
}

bootstrap();
