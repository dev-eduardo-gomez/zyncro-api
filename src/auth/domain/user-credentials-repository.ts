import type { User } from './user.js';

export abstract class UserCredentialsRepository {
  abstract findByEmail(email: string): Promise<User | null>;
}
