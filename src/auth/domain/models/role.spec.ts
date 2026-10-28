import { Role } from './role.js';

describe('Role', () => {
  it('defines exactly the MAKER, CHECKER and ADMIN roles', () => {
    expect(Object.values(Role)).toEqual(['MAKER', 'CHECKER', 'ADMIN']);
  });
});
