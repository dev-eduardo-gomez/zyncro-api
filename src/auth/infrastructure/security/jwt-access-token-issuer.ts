import { Inject, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import {
  AccessTokenClaims,
  AccessTokenIssuer,
  IssuedAccessToken,
} from '../../domain/ports/access-token-issuer.js';
import { jwtConfig } from '../config/jwt.config.js';
import type { ConfigType } from '@nestjs/config';

@Injectable()
export class JwtAccessTokenIssuer extends AccessTokenIssuer {
  constructor(
    private readonly jwtService: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {
    super();
  }

  issue(claims: AccessTokenClaims): IssuedAccessToken {
    const accessToken = this.jwtService.sign(claims);

    return {
      accessToken,
      expiresIn: this.config.expiresInSeconds,
    };
  }
}
