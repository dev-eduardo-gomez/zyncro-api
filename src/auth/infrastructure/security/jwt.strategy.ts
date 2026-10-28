import { Inject, Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { jwtConfig } from '../config/jwt.config.js';
import type { ConfigType } from '@nestjs/config';
import { AccessTokenClaims } from '../../domain/ports/access-token-issuer.js';
import { AuthenticatedUser } from '../../domain/models/authenticated-user.js';

interface PayloadAccessToken extends AccessTokenClaims {
  iat: number;
  exp: number;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(jwtConfig.KEY)
    config: ConfigType<typeof jwtConfig>,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: config.secret,
    });
  }

  async validate(payload: PayloadAccessToken): Promise<AuthenticatedUser> {
    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  }
}
