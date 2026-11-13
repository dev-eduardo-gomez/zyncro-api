# API HTTP y seguridad

El contrato `contracts/openapi.yaml` (OpenAPI 3.1) es la fuente de verdad: **una ruta que no está en el contrato no debe existir en el código**. Los tests e2e validan cada respuesta contra él.

## Endpoints

| Método | Ruta | Qué hace | Éxito | Errores propios |
|---|---|---|---|---|
| POST | `/auth/login` | Emite un token (ruta pública) | 200 | 401 |
| GET | `/auth/me` | Devuelve el usuario del token | 200 | — |
| POST | `/customers` | Crea un cliente | 201 | 409 `taxId` duplicado |
| GET | `/customers` | Lista clientes (sin paginar) | 200 | — |
| GET | `/customers/{customerId}` | Obtiene un cliente | 200 | 404 |
| PATCH | `/customers/{customerId}` | Actualiza un cliente | 200 | 404 |
| POST | `/invoices` | Emite una factura con sus partidas | 201 | 404 cliente inexistente |
| GET | `/invoices` | Lista con filtros y cursor | 200 | — (T4, en curso) |
| GET | `/invoices/{invoiceId}` | Obtiene una factura | 200 | 404 |
| POST | `/invoices/{invoiceId}/payments` | Registra un pago | 201 | 404, 409 factura cancelada |
| GET | `/invoices/{invoiceId}/payments` | Lista pagos, del más antiguo al más reciente | 200 | 404 |

Todas las rutas responden además **400** cuando la validación falla y **401** sin token o con un token inválido, salvo `/auth/login`, que es pública.

## Autenticación y autorización

```
POST /auth/login { email, password }
  → LoginUseCase: findByEmail → argon2.verify → JwtAccessTokenIssuer.issue
  ← { accessToken, tokenType: "Bearer", expiresIn }

GET /<cualquier ruta>  Authorization: Bearer <token>
  → JwtAuthGuard (global) → JwtStrategy.validate: { sub, email, role } → request.user = { id, email, role }
  → RolesGuard (global)
```

| Pieza | Ruta | Detalle |
|---|---|---|
| Guards globales | `src/auth/auth.module.ts` | `JwtAuthGuard` y `RolesGuard` se registran como `APP_GUARD`; protegen todas las rutas sin declararlos en cada controller |
| `@Public()` | `auth/infrastructure/security/public.decorator.ts` | Excluye una ruta de `JwtAuthGuard` (solo `/auth/login`) |
| `@Roles(...)` | `auth/infrastructure/security/roles.decorator.ts` | `RolesGuard` exige uno de esos roles; sin `@Roles`, deja pasar a cualquier usuario autenticado |
| Roles | `auth/domain/models/role.ts` | `MAKER`, `CHECKER`, `ADMIN` (enum `Role` en Prisma) |
| `@CurrentUser()` | `auth/infrastructure/http/current-user.decorator.ts` | Inyecta `request.user` en el handler |
| Contraseñas | `auth/infrastructure/security/argon2-password-hasher.ts` | argon2id, `memoryCost 65536`, `timeCost 3`, `parallelism 1` |
| Credenciales inválidas | `auth/application/login.use-case.ts` | Correo inexistente y contraseña incorrecta dan el **mismo** 401, para no revelar qué correos existen |

Hoy ningún endpoint de clientes ni de facturas restringe por rol: cualquier usuario autenticado puede usarlos.

## Validación de entrada

`CoreModule` registra un `ValidationPipe` global:

```ts
new ValidationPipe({
  whitelist: true,
  forbidNonWhitelisted: true,
  exceptionFactory: validationExceptionFactory,
})
```

- **`forbidNonWhitelisted`**: un campo que el DTO no declara responde 400. Así se impide que un cliente escriba columnas como `creditBalance` o `id` (asignación masiva).
- **Errores anidados**: `validationExceptionFactory` aplana los errores de objetos y listas a rutas con punto (`lineItems.0.unitPrice`).
- **Opcional pero no nulo**: para un campo que puede faltar pero no venir en `null`, se usa `@ValidateIf((_dto, value) => value !== undefined)` en lugar de `@IsOptional()`, que deja pasar `null`.
- **Listas de objetos**: necesitan `@ValidateNested({ each: true })` y `@Type(() => ItemDto)`. Sin las dos, los elementos no se validan.

## Errores: Problem Details (RFC 9457)

Todas las respuestas de error son `application/problem+json`. Las genera `ProblemDetailsFilter` (`src/shared/infrastructure/http/problem-details/`), que atrapa cualquier excepción.

```json
{
  "type": "https://cobrix.io/errors/business-rule/invoice-cancelled",
  "title": "Invoice is cancelled",
  "status": 409,
  "detail": "Cannot register a payment on a cancelled invoice.",
  "instance": "/invoices/7aa2.../payments",
  "timestamp": "2026-11-12T17:30:32.000Z"
}
```

| Excepción | `type` | `status` | Extra |
|---|---|---|---|
| `BusinessRuleViolation` (dominio) | `…/business-rule/<code>` | Según el catálogo | `detail` = mensaje del error |
| `RequestValidationException` (pipe) | `…/validation` | 400 | `errors: [{ field, detail }]` |
| `HttpException` < 500 (`NotFoundException`, etc.) | `about:blank` | La de la excepción | — |
| Cualquier otra | `about:blank` | 500 | Se registra en el log; `detail` genérico, sin filtrar detalles internos |

**Catálogo** (`business-rule-problem-catalog.ts`): cada código de dominio tiene su título y su status.

| Código | Status |
|---|---|
| `customer-duplicate-tax-id` | 409 |
| `invoice-cancelled` | 409 |
| `maker-checker-violation` | 403 |
| Cualquier otro código | 422 |

Para agregar una regla de negocio nueva: crea el error en `domain/errors/` extendiendo `BusinessRuleViolation` con un código en kebab-case, agrega su entrada al catálogo y declara la respuesta en el contrato.

## Probar la API a mano

La colección de [Bruno](https://www.usebruno.com/) está en `bruno/`. Las credenciales van en `bruno/.env` (no versionado; ver `bruno/.env.example`). `Login` guarda el `accessToken`, y los requests se encadenan con variables de runtime (`customerId`, `invoiceId`). Instrucciones en `bruno/README.md`.

## Pendientes conocidos

- `{customerId}` e `{invoiceId}` no se validan como UUID. Un id mal formado llega a la base de datos y puede terminar en 500.
- El contrato no declara respuestas 403 ni 422, aunque el catálogo las tiene previstas.
