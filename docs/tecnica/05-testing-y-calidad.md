# Testing y calidad

Cada regla se prueba en la capa más barata que la puede comprobar. El contrato OpenAPI se verifica automáticamente en cada respuesta e2e.

## Comandos

| Comando | Qué corre | Necesita |
|---|---|---|
| `npm test` | Unit (`**/*.spec.ts`) | Docker instalado (por `local-infrastructure.spec.ts`) |
| `npm run test:int` | Integración (`**/*.int-spec.ts`) | Postgres arriba y migraciones aplicadas |
| `npm run test:e2e` | E2E (`**/*.e2e-spec.ts`) | Postgres arriba, `.env` con `JWT_*` |
| `npm run test:cov` | Unit con cobertura | — |
| `npm run lint` | oxlint sobre `src/` y `test/` | — |
| `npx tsc --noEmit` | Tipos | Cliente de Prisma generado |
| `npm run contract:lint` | Redocly sobre `contracts/openapi.yaml` (`recommended-strict`) | — |

Para correr un solo archivo: `npx vitest run <ruta>` (unit), `npm run test:int -- <nombre>` o `npx vitest run --config ./vitest.config.e2e.ts <ruta>`.

## Tipos de test

| Tipo | Dónde | Qué prueba | Dobles |
|---|---|---|---|
| **Unit de dominio** | `src/**/domain/**/*.spec.ts` | Servicios puros: montos, vencimiento, estado derivado, reparto de pagos | Ninguno |
| **Unit de aplicación** | `src/**/application/*.spec.ts` | Casos de uso: qué llaman, qué devuelven, cuándo lanzan 404 | Fakes que extienden el puerto (`class FakeInvoiceRepository extends InvoiceRepository`) y `FixedClock` |
| **Integración** | `test/integration/*.int-spec.ts` | Adaptadores de Prisma contra Postgres real: mapeo, precisión, transacciones, concurrencia, paginación | Ninguno |
| **E2E** | `test/*.e2e-spec.ts` | La app completa por HTTP (Supertest) | Ninguno |
| **Contrato** | `test/contract/` | El validador del contrato y la seguridad de todas las operaciones | — |
| **Infraestructura** | `test/local-infrastructure.spec.ts` | `compose.yaml`: imágenes, puertos solo en `127.0.0.1`, volúmenes, healthchecks | — |

## El contrato en los tests

`test/contract/openapi-contract.ts` carga `contracts/openapi.yaml` y valida respuestas reales con AJV (modo estricto):

```ts
assertMatchesContract('post', '/invoices/{invoiceId}/payments', response);
```

Comprueba, en orden, que la operación existe, que el status está declarado, que el content-type coincide y que el body cumple el schema. Si algo no coincide, lanza `ContractViolation`.

`test/contract-security.e2e-spec.ts` recorre **todas** las operaciones del contrato y verifica que las protegidas respondan 401 sin token y con un token inválido. Si se declara una ruta en el contrato antes de implementarla, este test falla hasta que exista.

## Reglas para escribir tests

- **Primero RED.** Se escribe el test, se ve fallar por la razón correcta (por ejemplo, `Cannot find module` o `findPage is not a function`) y después se implementa.
- **Un test por regla**, y cada uno comprueba todo lo que la regla produce: respuesta, status y datos guardados.
- **Por la interfaz pública:** el endpoint, el caso de uso o el puerto, no detalles internos.
- **Sin depender del entorno:**
  - las fechas usan `FixedClock` y los servicios de fechas se prueban también con `TZ=America/Mexico_City` y `TZ=Asia/Tokyo`;
  - los tests de integración crean sus propios datos con un prefijo único (`taxId` `INV-INT-<timestamp>`), filtran por ellos y los borran en `afterAll`, porque la base de datos se comparte con otros suites y con datos de desarrollo.
- **Que fallen por la razón correcta:** cuando un test de error puede pasar por otra causa, se fija la causa esperada (`.rejects.toThrow(/numeric field overflow/)`).
- **Concurrencia de verdad:** los casos de carrera lanzan operaciones en paralelo con `Promise.all`.
- **Cada spec carga `.env` por su cuenta** (`if (existsSync('.env')) process.loadEnvFile()`). No hay `setupFiles` ni `globalSetup`.

## Antes de abrir un PR

- [ ] `npm test`, `npm run test:int` y `npm run test:e2e` en verde, salvo fallas ya conocidas y anotadas
- [ ] `npx tsc --noEmit` y `npm run lint` limpios
- [ ] `npm run contract:lint` válido si cambió el contrato
- [ ] Un endpoint nuevo tiene su e2e con `assertMatchesContract` y su request en `bruno/`
- [ ] En un PR encadenado, el slice pasa con solo su commit aplicado
