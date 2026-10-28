import type { Role } from './role.js';

export interface User {
  readonly id: string;
  readonly email: string;
  readonly passwordHash: string;
  readonly role: Role;
}
