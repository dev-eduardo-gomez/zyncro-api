import type { User } from '../models/user.js';

export abstract class UserCredentialsRepository {
  abstract findByEmail(email: string): Promise<User | null>;
}
