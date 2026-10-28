import { loadJwtConfig } from './jwt.config.js';

const VALID_SECRET = 'a-test-secret-that-is-long-enough-for-hs256';

describe('loadJwtConfig', () => {
  it('rejects a missing JWT_SECRET', () => {
    expect(() => loadJwtConfig({ JWT_EXPIRES_IN: '900' })).toThrow(
      'JWT_SECRET is not set',
    );
  });

  it('rejects an empty JWT_SECRET', () => {
    expect(() =>
      loadJwtConfig({ JWT_SECRET: '', JWT_EXPIRES_IN: '900' }),
    ).toThrow('JWT_SECRET is empty');
  });

  it('rejects a missing JWT_EXPIRES_IN', () => {
    expect(() => loadJwtConfig({ JWT_SECRET: VALID_SECRET })).toThrow(
      'JWT_EXPIRES_IN is not set',
    );
  });

  it.each(['15m', '0', '-5', '1.5', ''])(
    'rejects JWT_EXPIRES_IN=%j because it is not a positive integer number of seconds',
    (expiresIn) => {
      expect(() =>
        loadJwtConfig({ JWT_SECRET: VALID_SECRET, JWT_EXPIRES_IN: expiresIn }),
      ).toThrow('JWT_EXPIRES_IN must be a positive integer number of seconds');
    },
  );

  it('returns the secret and the expiry in seconds when both are valid', () => {
    const config = loadJwtConfig({
      JWT_SECRET: VALID_SECRET,
      JWT_EXPIRES_IN: '900',
    });

    expect(config).toEqual({ secret: VALID_SECRET, expiresInSeconds: 900 });
  });
});
