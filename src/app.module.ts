import { DynamicModule, Module } from '@nestjs/common';
import { createObserveModule } from '@nestjs/observe';
import { PrismaModule } from './shared/infrastructure/persistence/prisma/prisma.module.js';
import { CoreModule } from './core/core.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ObserveCredentials } from './shared/infrastructure/observability/observe.config.js';
import { CustomersModule } from './customers/customers.module.js';
import { InvoicesModule } from './invoices/invoices.module.js';

export const { ObserveModule, ObserveInstrument } = createObserveModule();

@Module({
  imports: [
    PrismaModule,
    CoreModule,
    AuthModule,
    CustomersModule,
    InvoicesModule,
  ],
})
export class AppModule {
  static forRoot(observe: ObserveCredentials | null): DynamicModule {
    if (observe === null) return { module: AppModule };

    return {
      module: AppModule,
      imports: [
        ObserveModule.forRoot({ ...observe, serviceId: 'zyncro-api' }),
      ],
    };
  }
}
