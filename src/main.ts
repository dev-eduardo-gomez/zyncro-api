import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { existsSync } from 'node:fs';

async function bootstrap() {
  if (existsSync('.env')) process.loadEnvFile();

  const app = await NestFactory.create(AppModule, {
    instrument: ObserveInstrument,
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
