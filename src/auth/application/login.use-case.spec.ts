import { LoginUseCase } from './login.use-case.js';
import { PasswordHasher } from '../domain/ports/password-hasher.js';
import { UserCredentialsRepository } from '../domain/ports/user-credentials-repository.js';
import { AccessTokenIssuer } from '../domain/ports/access-token-issuer.js';
import { Role } from '../domain/models/role.js';
import type { User } from '../domain/models/user.js';

class FakeUserCredentialsRepository extends UserCredentialsRepository {
  constructor(private readonly user: User | null) {
    super();
  }

  findByEmail(email: string): Promise<User | null> {
    return Promise.resolve(this.user?.email === email ? this.user : null);
  }
}

class FakePasswordHasher extends PasswordHasher {
  constructor(private readonly isValid: boolean) {
    super();
  }

  hash(): Promise<string> {
    throw new Error('not used by the login flow');
  }

  verify(): Promise<boolean> {
    return Promise.resolve(this.isValid);
  }
}

class FakeAccessTokenIssuer extends AccessTokenIssuer {
  issue(payload: { sub: string; email: string; role: Role }) {
    return { accessToken: `token-for-${payload.sub}`, expiresIn: 900 };
  }
}

const existingUser: User = {
  id: 'user-1',
  email: 'maker@zyncro.test',
  passwordHash: 'hashed-password',
  role: Role.MAKER,
};

describe('LoginUseCase', () => {
  it('returns a Bearer access token and its expiry for valid credentials', async () => {
    const useCase = new LoginUseCase(
      new FakeUserCredentialsRepository(existingUser),
      new FakePasswordHasher(true),
      new FakeAccessTokenIssuer(),
    );

    const result = await useCase.execute({
      email: existingUser.email,
      password: 'correct-password',
    });

    expect(result).toEqual({
      accessToken: `token-for-${existingUser.id}`,
      tokenType: 'Bearer',
      expiresIn: 900,
    });
  });

  it('rejects with "Invalid email or password." when the email does not exist', async () => {
    const useCase = new LoginUseCase(
      new FakeUserCredentialsRepository(null),
      new FakePasswordHasher(true),
      new FakeAccessTokenIssuer(),
    );

    await expect(
      useCase.execute({ email: 'missing@zyncro.test', password: 'whatever' }),
    ).rejects.toThrow('Invalid email or password.');
  });

  it('rejects with "Invalid email or password." when the password is wrong', async () => {
    const useCase = new LoginUseCase(
      new FakeUserCredentialsRepository(existingUser),
      new FakePasswordHasher(false),
      new FakeAccessTokenIssuer(),
    );

    await expect(
      useCase.execute({
        email: existingUser.email,
        password: 'wrong-password',
      }),
    ).rejects.toThrow('Invalid email or password.');
  });
});
