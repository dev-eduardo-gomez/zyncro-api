import { loadObserveCredentials } from './observe.config.js';

describe('loadObserveCredentials', () => {
  it.each([{}, { OBSERVE_APP_KEY: '', OBSERVE_APP_SECRET: '' }])(
    'returns null when no credential is set (%j), so telemetry stays off',
    (env) => {
      expect(loadObserveCredentials(env)).toBeNull();
    },
  );

  it.each([
    { OBSERVE_APP_KEY: 'key' },
    { OBSERVE_APP_KEY: 'key', OBSERVE_APP_SECRET: '' },
    { OBSERVE_APP_SECRET: 'secret' },
    { OBSERVE_APP_KEY: '', OBSERVE_APP_SECRET: 'secret' },
  ])('rejects %j because only one credential is set', (env) => {
    expect(() => loadObserveCredentials(env)).toThrow(
      'OBSERVE_APP_KEY and OBSERVE_APP_SECRET must be set together',
    );
  });

  it('returns both credentials when both are set', () => {
    const credentials = loadObserveCredentials({
      OBSERVE_APP_KEY: 'key',
      OBSERVE_APP_SECRET: 'secret',
    });

    expect(credentials).toEqual({ appKey: 'key', appSecret: 'secret' });
  });
});
