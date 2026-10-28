import type { Role } from './role.js';

export interface AuthenticatedUser {
  readonly id: string;
  readonly email: string;
  readonly role: Role;
}
