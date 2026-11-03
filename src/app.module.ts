import { DynamicModule, Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { PrismaModule } from './shared/infrastructure/persistence/prisma/prisma.module.js';
import { CoreModule } from './core/core.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ObserveCredentials } from './shared/infrastructure/observability/observe.config.js';
import { CustomersModule } from './customers/customers.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [PrismaModule, CoreModule, AuthModule, CustomersModule],
})
export class AppModule {
  // Decided at bootstrap, after the .env file is loaded: the @Module()
  // metadata above is evaluated on import, before any environment exists.
  static forRoot(observe: ObserveCredentials | null): DynamicModule {
    if (observe === null) return { module: AppModule };

    return {
      module: AppModule,
      imports: [
        // Distributed tracing, auto-correlated logs, request/job metrics, error
        // telemetry, alarms, and more. Sign up at https://observe.nestjs.com
        ObserveModule.forRoot({ ...observe, serviceId: 'zyncro-api' }),
      ],
    };
  }
}
