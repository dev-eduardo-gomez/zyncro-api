import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule, ObserveInstrument } from './app.module.js';
import { loadObserveCredentials } from './shared/infrastructure/observability/observe.config.js';
import { existsSync } from 'node:fs';

async function bootstrap() {
  if (existsSync('.env')) process.loadEnvFile();

  const observe = loadObserveCredentials(process.env);
  if (observe === null)
    Logger.log(
      'Observe telemetry disabled: OBSERVE_APP_KEY and OBSERVE_APP_SECRET are not set',
      'Bootstrap',
    );

  const app = await NestFactory.create(AppModule.forRoot(observe), {
    instrument: observe === null ? undefined : ObserveInstrument,
  });
  app.enableShutdownHooks();
  await app.listen(process.env.PORT ?? 3000);
}
await bootstrap();
