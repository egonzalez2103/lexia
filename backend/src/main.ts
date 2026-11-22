import { mkdirSync } from 'fs';
import { join } from 'path';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { prepareSchema } from './prepare-schema';

async function bootstrap() {
  mkdirSync(join(process.cwd(), 'uploads'), { recursive: true });
  await prepareSchema();
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  app.useStaticAssets(join(process.cwd(), 'uploads'), { prefix: '/uploads' });
  app.enableCors({ origin: true, credentials: true });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );
  const config = app.get(ConfigService);
  const port = parseInt(config.get<string>('PORT', '3001'), 10);
  await app.listen(port);
}

void bootstrap();
