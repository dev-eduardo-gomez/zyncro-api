# API contract

`openapi.yaml` (OpenAPI 3.1) is the source of truth for the Cobrix HTTP API.
A route that is not in the contract must not exist in the code.

## Workflow per issue

1. **Contract:** design the operations, schemas, errors, and examples in `openapi.yaml`.
2. **Review:** read the contract against the issue's business rules before any test exists.
3. **Tests:** write RED unit, e2e, and contract tests.
4. **Code:** implement until the tests are GREEN.

## Conventions

- Every route requires a bearer JWT unless the operation sets `security: []`.
- Every error is RFC 9457 Problem Details (`application/problem+json`) with the
  `instance` and `timestamp` extensions. Reuse `components.responses` (`ValidationFailed`,
  `Unauthorized`, `InternalError`) instead of redeclaring them.
- Problem `type`: `https://cobrix.io/errors/validation`,
  `https://cobrix.io/errors/business-rule/{code}`, or `about:blank`.
- Response schemas set `additionalProperties: false`, so a renamed or leaked field
  fails the contract tests.
- Request and response examples live in the contract (`example` on each media type).
  Issues link to them instead of copying them.

## Commands

```bash
npm run contract:lint   # Redocly "recommended-strict": any warning fails the lint
npm test                # includes test/contract/openapi-contract.spec.ts
npm run test:e2e        # e2e tests assert real responses against the contract
```

## Contract tests

`test/contract/openapi-contract.ts` loads this file and validates a response with
Ajv (JSON Schema 2020-12 plus formats). Call it with the **path template** from
the contract, not the concrete URL:

```ts
const response = await request(app.getHttpServer()).get(`/invoices/${id}`);

assertMatchesContract('get', '/invoices/{id}', response);
```

It fails when the status is not declared for the operation, when the content type
differs, or when the body does not match the schema. It checks the response's
**shape**, not the business rule, so e2e tests keep their own assertions too.

## Contract security

`test/contract-security.e2e-spec.ts` reads every operation from the contract.
Each one that requires authentication (it inherits the global `bearerAuth`, or it
declares its own requirement) must answer 401 without a token and with an invalid
token. When you add a protected operation to the contract, the test covers it with
no extra code. When a route is public in the code (`@Public()`) but protected in the
contract, or the other way around, the test fails.
