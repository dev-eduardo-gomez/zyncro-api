## Problema
Zyncro maneja información con implicaciones legales y fiscales: facturas, pagos y egresos. Hoy el contrato de la API está implícito en el código: ningún documento dice qué acepta y qué devuelve cada endpoint, ni qué errores produce. Si un DTO cambia por accidente, nadie se entera hasta que un cliente falla.

## Alcance
- `contracts/openapi.yaml` (OpenAPI 3.1) como **fuente de verdad**. Ya está redactado e incluye `POST /auth/login` (`login`) y `GET /auth/me` (`getCurrentUser`), además de las convenciones comunes: `ProblemDetails`, `ValidationProblemDetails` y `bearerAuth`.
- Lint del contrato (`npm run contract:lint`, con Redocly y las reglas `recommended-strict`, donde todo warning es error).
- Pruebas de contrato: un helper de test valida cada respuesta e2e contra el spec.
- Seguridad del contrato: un e2e recorre las operaciones del contrato y verifica que toda operación protegida responda `401` sin token o con un token inválido, para que el contrato y los guards (`JwtAuthGuard` + `@Public()`) nunca se desalineen.
- Eliminar `GET /` (el "Hello World" del scaffold), porque no forma parte del contrato.

## Fuera de alcance
- CI: el lint y las pruebas se integran en #12.
- Generar código o DTOs a partir del spec, Swagger UI y mock server.

## Reglas de negocio
- R1. Ningún endpoint existe en el código si antes no existe en `contracts/openapi.yaml`.
- R2. Cada issue sigue el orden **contrato → revisión → tests → código**.
- R3. Todo error es Problem Details (`application/problem+json`) con `instance` y `timestamp`.
- R4. Seguro por defecto: toda operación exige `bearerAuth` (regla global) salvo las que declaren `security: []`. Hoy la única es `POST /auth/login`, porque es la que entrega el token.

## Contrato
`contracts/openapi.yaml`: operaciones `login` y `getCurrentUser`, más `components.schemas` y `components.responses`. Pasa `redocly lint` sin errores ni warnings.

## Criterios de aceptación
- `npm run contract:lint` termina sin errores ni warnings.
- Los e2e validan contra el contrato estas respuestas: login `200`, `400` y `401`, y `/auth/me` `200` y `401`.
- Si se renombra un campo de la respuesta en el código (por ejemplo, `expiresIn` → `expires_in`), al menos un e2e falla.
- Un `status` que el contrato no declara para esa operación hace fallar el test.
- `GET /` responde `404` como Problem Details.
- Si una operación protegida en el contrato queda pública en el código (por ejemplo, con `@Public()`), el e2e de seguridad del contrato falla.

## Reparto
- **Claude:** contrato, configuración de Redocly y script `contract:lint`, helper de pruebas de contrato con sus tests, aserciones de contrato en los e2e existentes, el e2e de seguridad del contrato y el e2e RED de `GET /` → `404`. También elimina `app.controller.spec.ts`.
- **Tú:** revisar el contrato contra el código (paso 1) y eliminar `AppController` y `AppService` junto con su registro en `AppModule`.

## Guía paso a paso
1. **Lee el contrato antes de tocar código.** Compáralo con `auth.controller.ts`, `login.use-case.ts` y `problem-details.filter.ts`.
   - ¿Por qué `AccessToken` y `AuthenticatedUser` tienen `additionalProperties: false`, pero `ProblemDetails` no?
   - ¿Qué significa `security: []` en `/auth/login` si el documento declara seguridad global?
   - ¿Por qué `ValidationProblemDetails` usa `allOf` en vez de copiar los campos?

   Si encuentras una diferencia entre el contrato y el comportamiento real, anótala aquí: uno de los dos está mal, y decidir cuál es parte del ejercicio.
2. **Lee el helper de contrato** cuando Claude lo entregue. Responde: ¿cómo resuelve los `$ref` internos? ¿Por qué necesita JSON Schema 2020-12 y los formatos (`email`, `uuid`, `date-time`)?
3. **Elimina `GET /`** hasta que el e2e RED pase a GREEN. ¿Por qué no basta con dejar el endpoint sin documentarlo en el contrato?
4. **Verificación final:** corre `npm run contract:lint`, `npm test`, `npm run test:e2e` y `npm run lint`.

## Aprendizaje
- **Teoría:** API-first vs. code-first; estructura de OpenAPI 3.1 (`paths`, `components`, `$ref`, `security`); JSON Schema 2020-12; prueba de contrato del lado del proveedor vs. test e2e.
- **Práctica:** leer un contrato como especificación y detectar diferencias con el código.

## Dependencias
#3, #4

## Referencias
`contracts/openapi.yaml`, `odd/backlog-api-first.md`, RFC 9457, [OpenAPI 3.1](https://spec.openapis.org/oas/v3.1.0), [Redocly CLI lint](https://redocly.com/docs/cli/commands/lint).
