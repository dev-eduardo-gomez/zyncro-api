# Arquitectura

Zyncro API es una aplicación NestJS 12 con **arquitectura hexagonal** (puertos y adaptadores), organizada por módulo de negocio. Las reglas de negocio no dependen del framework ni de la base de datos: las dependencias siempre apuntan hacia el dominio.

## Stack

| Área | Tecnología |
|---|---|
| Runtime | Node.js, TypeScript 6 (`strict`), ES modules (`"type": "module"`, `nodenext`) |
| Framework | NestJS 12 (`platform-express`) |
| Base de datos | PostgreSQL 16 + Prisma ORM 7 (`@prisma/adapter-pg`) |
| Dinero | `decimal.js` |
| Seguridad | JWT (`@nestjs/jwt`, `passport-jwt`), argon2id |
| Validación | `class-validator` + `ValidationPipe` global |
| Contrato | OpenAPI 3.1 (`contracts/openapi.yaml`), Redocly |
| Tests | Vitest, Supertest, AJV (validación contra el contrato) |
| Lint | oxlint |
| Observabilidad | `@nestjs/observe` (opcional) |

## Capas

```
            ┌──────────────── infrastructure ────────────────┐
 HTTP  ───▶ │ controller + DTO          adaptador Prisma     │ ───▶ PostgreSQL
            └──────┬───────────────────────────▲─────────────┘
                   │ llama                     │ implementa
            ┌──────▼──────── application ──────┴─────────────┐
            │ caso de uso (orquesta, lanza 404)              │
            └──────┬─────────────────────────────────────────┘
                   │ usa
            ┌──────▼────────── domain ───────────────────────┐
            │ modelos · servicios puros · puertos · errores  │
            └────────────────────────────────────────────────┘
```

| Capa | Contiene | Puede importar | No puede importar |
|---|---|---|---|
| `domain/` | Modelos (interfaces), servicios puros, puertos (`abstract class`), errores de negocio | Solo `domain/` y `decimal.js` | NestJS, Prisma, HTTP |
| `application/` | Casos de uso (`*.use-case.ts`) | `domain/`, `@nestjs/common` (`@Injectable`, `NotFoundException`, `UnauthorizedException`) | Prisma, adaptadores |
| `infrastructure/http/` | Controllers, DTOs, decoradores | `application/`, `domain/` | Prisma |
| `infrastructure/persistence/` | Adaptadores `Prisma*Repository` | `domain/`, `PrismaService` | Controllers |

## Estructura de carpetas

```
src/
├── main.ts                 bootstrap: .env, observabilidad, shutdown hooks, puerto
├── app.module.ts           compone los módulos
├── core/                   ValidationPipe y ProblemDetailsFilter globales
├── auth/                   login, JWT, guards globales, roles
├── customers/              clientes (T1 de #5)
├── invoices/               facturas, pagos y listado (T2-T4 de #5)
├── shared/
│   ├── domain/             BusinessRuleViolation, puerto Clock
│   └── infrastructure/     Problem Details, PrismaService, reloj, observabilidad
└── generated/prisma/       cliente de Prisma generado (no versionado)
```

Cada módulo de negocio repite la misma forma:

```
<módulo>/
├── <módulo>.module.ts
├── domain/{models,ports,services,errors}/
├── application/*.use-case.ts (+ .spec.ts)
└── infrastructure/{http,persistence}/
```

## Composición (módulos de Nest)

`AppModule` importa `PrismaModule` (global), `CoreModule`, `AuthModule`, `CustomersModule` e `InvoicesModule`. Si hay credenciales de observabilidad, agrega también `ObserveModule`.

Cada módulo conecta sus puertos con su adaptador usando la clase abstracta como token:

```ts
providers: [
  CreateInvoiceUseCase,
  { provide: InvoiceRepository, useClass: PrismaInvoiceRepository },
  { provide: PaymentRepository, useClass: PrismaPaymentRepository },
]
```

| Módulo | Importa | Exporta |
|---|---|---|
| `CustomersModule` | — | `CustomerRepository` (lo usa `InvoicesModule` para validar el cliente al facturar) |
| `InvoicesModule` | `ClockModule`, `CustomersModule` | — |
| `AuthModule` | `ConfigModule.forFeature(jwtConfig)`, `JwtModule` | — (registra los guards globales) |
| `ClockModule` | — | `Clock` → `SystemClock` |

## Recorrido de una request

`POST /invoices/{id}/payments`:

1. **`JwtAuthGuard`** (global) valida el token Bearer; **`RolesGuard`** (global) revisa `@Roles(...)` si la ruta lo declara.
2. **`ValidationPipe`** (global) valida `CreatePaymentDto` y rechaza campos de más (`whitelist` + `forbidNonWhitelisted`).
3. **`InvoicesController`** convierte el DTO en `NewPayment` y llama a `RegisterPaymentUseCase`.
4. **El caso de uso** le pasa al puerto `PaymentRepository` un closure que ejecuta `allocatePayment` (dominio).
5. **`PrismaPaymentRepository`** bloquea la factura, ejecuta el closure y escribe todo en una transacción.
6. Si algo lanza un error, **`ProblemDetailsFilter`** (global) lo convierte en `application/problem+json`.

## Configuración y arranque

| Variable | Uso | Obligatoria |
|---|---|---|
| `DATABASE_URL` | Conexión de Prisma | Sí: `PrismaService` falla al arrancar si falta o está vacía |
| `JWT_SECRET` | Firma de tokens | Sí: falla al arrancar |
| `JWT_EXPIRES_IN` | Vigencia del token en segundos (entero positivo) | Sí: falla al arrancar |
| `OBSERVE_APP_KEY`, `OBSERVE_APP_SECRET` | Telemetría de NestJS Observe | No; van juntas o ninguna. Sin ellas, la telemetría queda apagada |
| `PORT` | Puerto HTTP | No; por defecto 3000 |

`main.ts` carga `.env` si existe (`process.loadEnvFile()`). La configuración se lee con `registerAs` + `ConfigType`, no con `ConfigService`. La API no usa prefijo global, CORS ni Swagger: el contrato vive en `contracts/openapi.yaml`.

## Infraestructura local

`compose.yaml` levanta PostgreSQL 16, Redis 7 y Mailpit, todos publicados solo en `127.0.0.1`. Hoy el código usa **solo PostgreSQL**; Redis y Mailpit están listos para los recordatorios y las colas de fases siguientes. Para ponerlo en marcha, ver el [README](../../README.md).
