export const Role = {
  MAKER: 'MAKER',
  CHECKER: 'CHECKER',
  ADMIN: 'ADMIN',
} as const;

export type Role = (typeof Role)[keyof typeof Role];
