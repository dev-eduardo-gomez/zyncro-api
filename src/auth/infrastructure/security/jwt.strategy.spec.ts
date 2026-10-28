import { JwtStrategy } from './jwt.strategy.js';
import { Role } from '../../domain/models/role.js';

describe('JwtStrategy', () => {
  it('maps the token payload to the authenticated user shape', async () => {
    const strategy = new JwtStrategy({
      secret: 'test-secret',
      expiresInSeconds: 900,
    });

    const user = await strategy.validate({
      sub: 'user-1',
      email: 'maker@zyncro.test',
      role: Role.MAKER,
      iat: 0,
      exp: 0,
    });

    expect(user).toEqual({
      id: 'user-1',
      email: 'maker@zyncro.test',
      role: Role.MAKER,
    });
  });
});
