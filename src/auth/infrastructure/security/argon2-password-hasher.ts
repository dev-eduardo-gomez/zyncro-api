import { Injectable } from '@nestjs/common';
import { PasswordHasher } from '../../domain/password-hasher.js';
import * as argon2 from 'argon2';

@Injectable()
export class Argon2PasswordHasher extends PasswordHasher {
  hash(plainPassword: string): Promise<string> {
    return argon2.hash(plainPassword, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
      parallelism: 1,
    });
  }

  verify(plainPassword: string, passwordHash: string): Promise<boolean> {
    return argon2.verify(passwordHash, plainPassword);
  }
}
