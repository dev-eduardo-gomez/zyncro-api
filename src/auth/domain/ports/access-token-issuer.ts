import type { Role } from '../models/role.js';

export interface AccessTokenClaims {
  readonly sub: string;
  readonly email: string;
  readonly role: Role;
}

export interface IssuedAccessToken {
  readonly accessToken: string;
  readonly expiresIn: number;
}

export abstract class AccessTokenIssuer {
  abstract issue(claims: AccessTokenClaims): IssuedAccessToken;
}
