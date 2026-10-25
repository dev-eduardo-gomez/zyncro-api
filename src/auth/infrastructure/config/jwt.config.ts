import { registerAs } from '@nestjs/config';

export const loadJwtConfig = (
  env: Record<string, string | undefined>,
): { expiresInSeconds: number; secret: string } => {
  const secret = env.JWT_SECRET;

  if (secret === undefined) throw new Error('JWT_SECRET is not set');
  if (secret === '') throw new Error('JWT_SECRET is empty');

  const expiresIn = env.JWT_EXPIRES_IN;
  if (expiresIn === undefined) throw new Error('JWT_EXPIRES_IN is not set');

  const isPositiveInteger = /^[1-9]\d*$/.test(expiresIn);
  if (!isPositiveInteger)
    throw new Error(
      'JWT_EXPIRES_IN must be a positive integer number of seconds',
    );

  return {
    expiresInSeconds: Number(expiresIn),
    secret,
  };
};

export const jwtConfig = registerAs(
  'jwt',
  (): { expiresInSeconds: number; secret: string } =>
    loadJwtConfig(process.env),
);
