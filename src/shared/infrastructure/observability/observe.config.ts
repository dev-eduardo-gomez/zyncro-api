export interface ObserveCredentials {
  appKey: string;
  appSecret: string;
}

export const loadObserveCredentials = (
  env: Record<string, string | undefined>,
): ObserveCredentials | null => {
  const appKey = env.OBSERVE_APP_KEY ?? '';
  const appSecret = env.OBSERVE_APP_SECRET ?? '';

  if (appKey === '' && appSecret === '') return null;
  if (appKey === '' || appSecret === '')
    throw new Error(
      'OBSERVE_APP_KEY and OBSERVE_APP_SECRET must be set together',
    );

  return { appKey, appSecret };
};
