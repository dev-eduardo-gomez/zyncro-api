import { Module } from '@nestjs/common';
import { AuthController } from './infrastructure/http/auth.controller.js';
import { LoginUseCase } from './application/login.use-case.js';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigType } from '@nestjs/config';
import { jwtConfig } from './infrastructure/config/jwt.config.js';
import { UserCredentialsRepository } from './domain/ports/user-credentials-repository.js';
import { PrismaUserCredentialsRepository } from './infrastructure/persistence/prisma-user-credentials-repository.js';
import { PasswordHasher } from './domain/ports/password-hasher.js';
import { Argon2PasswordHasher } from './infrastructure/security/argon2-password-hasher.js';
import { AccessTokenIssuer } from './domain/ports/access-token-issuer.js';
import { JwtAccessTokenIssuer } from './infrastructure/security/jwt-access-token-issuer.js';
import { JwtStrategy } from './infrastructure/security/jwt.strategy.js';

@Module({
  imports: [
    ConfigModule.forFeature(jwtConfig),
    JwtModule.registerAsync({
      imports: [ConfigModule.forFeature(jwtConfig)],
      inject: [jwtConfig.KEY],
      useFactory: (config: ConfigType<typeof jwtConfig>) => ({
        secret: config.secret,
        signOptions: {
          expiresIn: config.expiresInSeconds,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    LoginUseCase,
    JwtStrategy,
    {
      provide: UserCredentialsRepository,
      useClass: PrismaUserCredentialsRepository,
    },
    {
      provide: PasswordHasher,
      useClass: Argon2PasswordHasher,
    },
    {
      provide: AccessTokenIssuer,
      useClass: JwtAccessTokenIssuer,
    },
  ],
})
export class AuthModule {}
