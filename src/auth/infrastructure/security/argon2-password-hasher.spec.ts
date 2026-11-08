import { Argon2PasswordHasher } from './argon2-password-hasher.js';

describe('Argon2PasswordHasher', () => {
  const hasher = new Argon2PasswordHasher();

  it('never returns the plain password as the hash', async () => {
    const hash = await hasher.hash('Sup3rSecret!');

    expect(hash).not.toBe('Sup3rSecret!');
  });

  it('hashes the same password differently on every call', async () => {
    const [first, second] = await Promise.all([
      hasher.hash('Sup3rSecret!'),
      hasher.hash('Sup3rSecret!'),
    ]);

    expect(first).not.toBe(second);
  });

  it('verifies a password against its own hash', async () => {
    const hash = await hasher.hash('Sup3rSecret!');

    await expect(hasher.verify('Sup3rSecret!', hash)).resolves.toBe(true);
  });

  it('rejects the wrong password against a hash', async () => {
    const hash = await hasher.hash('Sup3rSecret!');

    await expect(hasher.verify('wrong-password', hash)).resolves.toBe(false);
  });
});
