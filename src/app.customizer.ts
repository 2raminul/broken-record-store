import { INestApplication, ValidationPipe, VersioningType } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import * as compression from 'compression';
import helmet from 'helmet';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

export function customizeApp(app: INestApplication): void {
  app.use(helmet());
  app.use(compression());
  app.enableCors();

  app.enableVersioning({ type: VersioningType.URI, defaultVersion: '1' });

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
      forbidNonWhitelisted: true,
    }),
  );

  app.useGlobalFilters(new AllExceptionsFilter());
  app.useGlobalInterceptors(new LoggingInterceptor());

  app.setGlobalPrefix('api');
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Broken Record Store API')
    .setDescription('Point-of-sale API for vinyl, CD, and more')
    .setVersion('1.0')
    .addTag('Records')
    .addTag('Orders')
    .addTag('Health')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);
}
