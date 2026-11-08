import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UserCredentialsRepository } from '../domain/ports/user-credentials-repository.js';
import { PasswordHasher } from '../domain/ports/password-hasher.js';
import { AccessTokenIssuer } from '../domain/ports/access-token-issuer.js';

@Injectable()
export class LoginUseCase {
  constructor(
    private readonly userCredentialsRepository: UserCredentialsRepository,
    private readonly passwordHasher: PasswordHasher,
    private readonly accessTokenIssuer: AccessTokenIssuer,
  ) {}

  async execute(userData: {
    email: string;
    password: string;
  }): Promise<{ accessToken: string; tokenType: string; expiresIn: number }> {
    const user = await this.userCredentialsRepository.findByEmail(
      userData.email,
    );
    if (user === null)
      throw new UnauthorizedException('Invalid email or password.');

    const isPasswordValid = await this.passwordHasher.verify(
      userData.password,
      user.passwordHash,
    );

    if (!isPasswordValid)
      throw new UnauthorizedException('Invalid email or password.');

    const accessTokenData = this.accessTokenIssuer.issue({
      sub: user.id,
      email: user.email,
      role: user.role,
    });

    return {
      accessToken: accessTokenData.accessToken,
      tokenType: 'Bearer',
      expiresIn: accessTokenData.expiresIn,
    };
  }
}
