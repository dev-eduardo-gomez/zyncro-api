import { Injectable } from '@nestjs/common';
import { Clock } from '../../domain/ports/clock.js';

@Injectable()
export class SystemClock extends Clock {
  now(): Date {
    return new Date();
  }
}
