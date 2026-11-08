import { Module } from '@nestjs/common';
import { Clock } from '../../domain/ports/clock.js';
import { SystemClock } from './system-clock.js';

@Module({
  providers: [
    {
      provide: Clock,
      useClass: SystemClock,
    },
  ],
  exports: [Clock],
})
export class ClockModule {}
