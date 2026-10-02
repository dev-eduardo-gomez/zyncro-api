import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';

function loadComposeConfig() {
  const output = execFileSync(
    'docker',
    ['compose', '--env-file', '.env.example', 'config', '--format', 'json'],
    { encoding: 'utf8' },
  );
  return JSON.parse(output);
}

describe('local infrastructure', () => {
  it('runs PostgreSQL 16', () => {
    const config = loadComposeConfig();

    expect(config.services.postgres.image).toBe('postgres:16-alpine');
  });

  it('configures PostgreSQL credentials from environment variables', () => {
    const environment = loadComposeConfig().services.postgres.environment;

    expect(environment.POSTGRES_DB).toBeTruthy();
    expect(environment.POSTGRES_USER).toBeTruthy();
    expect(environment.POSTGRES_PASSWORD).toBeTruthy();
  });

  it('publishes PostgreSQL only on localhost', () => {
    const [port] = loadComposeConfig().services.postgres.ports;

    expect(port.host_ip).toBe('127.0.0.1');
    expect(port.published).toBe('15432');
    expect(port.target).toBe(5432);
  });

  it('persists PostgreSQL data in a named volume', () => {
    const [mount] = loadComposeConfig().services.postgres.volumes;

    expect(mount.type).toBe('volume');
    expect(mount.source).toBe('postgres_data');
    expect(mount.target).toBe('/var/lib/postgresql/data');

    const config = loadComposeConfig();
    expect(config.volumes).toHaveProperty('postgres_data');
  });

  it('checks PostgreSQL readiness with pg_isready', () => {
    const healthcheck = loadComposeConfig().services.postgres.healthcheck;

    expect(healthcheck.test[0]).toBe('CMD-SHELL');
    expect(healthcheck.test[1]).toContain('pg_isready');
    expect(healthcheck.retries).toBeGreaterThan(0);
  });

  it('runs Redis 7', () => {
    const config = loadComposeConfig();

    expect(config.services.redis.image).toBe('redis:7-alpine');
  });

  it('publishes Redis only on localhost', () => {
    const [port] = loadComposeConfig().services.redis.ports;

    expect(port.host_ip).toBe('127.0.0.1');
    expect(port.published).toBe('6379');
    expect(port.target).toBe(6379);
  });

  it('checks Redis readiness with redis-cli ping', () => {
    const healthcheck = loadComposeConfig().services.redis.healthcheck;

    expect(healthcheck.test).toEqual(['CMD', 'redis-cli', 'ping']);
  });
});
