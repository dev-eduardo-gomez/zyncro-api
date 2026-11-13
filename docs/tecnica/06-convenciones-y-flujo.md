# Convenciones y flujo de trabajo

Cómo se escribe, se prueba y se entrega el código en este repositorio.

## Código

| Regla | Detalle |
|---|---|
| **Imports con `.js`** | El proyecto compila a ES modules: los imports relativos terminan en `.js` aunque el archivo sea `.ts` (`'../domain/models/invoice.js'`). |
| **Sin comentarios en TypeScript** | El código de `src/` y `test/` no lleva comentarios. El porqué de una decisión va en el log ODD (`odd/tasks/`), en el PR o en esta documentación. Los archivos que no son TypeScript (`schema.prisma`, `openapi.yaml`, `.env.example`) sí conservan sus comentarios. |
| **Nombres con el lenguaje del negocio** | `isDueSoon`, `isPartiallyPaid`, `allocatePayment`. Nada heredado de otro dominio. |
| **Dinero como texto** | Ver [Dominio](02-dominio-cuentas-por-cobrar.md#dinero). Nunca `number` ni `parseFloat`. |
| **Tipos de retorno honestos** | Si un caso de uso lanza `NotFoundException` cuando no encuentra algo, su retorno no incluye `| null`. |
| **Errores de Prisma** | Se atrapa solo el código esperado (`P2002`, `P2025`) y se relanza el resto. Nunca un `catch` que solo relanza o que se traga el error. |
| **Inyección por clase abstracta** | Los puertos son `abstract class`, así sirven de token de inyección: `{ provide: InvoiceRepository, useClass: PrismaInvoiceRepository }`. |
| **Una lectura del reloj por operación** | Los casos de uso llaman a `clock.now()` una sola vez al inicio de `execute`. |
| **Rutas de un recurso hijo bajo su padre** | Los pagos viven en `InvoicesController` como `:id/payments`. |

## API primero

El orden de trabajo de cada funcionalidad es:

1. **Contrato** en `contracts/openapi.yaml` (`npm run contract:lint`).
2. **Tests en RED**: unit del dominio y de los casos de uso, integración del adaptador y e2e del endpoint.
3. **Modelos y puertos** del dominio.
4. **Implementación** hasta GREEN: servicios de dominio → casos de uso → adaptador → DTO → controller → módulo.
5. **Request en Bruno** (`bruno/`) en el mismo cambio que agrega el endpoint.

## Organic Driven Development (ODD)

Las tareas grandes se registran en `odd/tasks/<feature>.md`:

| Sección | Contenido |
|---|---|
| Encabezado | Objetivo, rama, estrategia de entrega y runner de tests |
| `## Specs` | Requisitos numerados (`S#`, `R#`) que citan textualmente lo que pidió el usuario |
| `## Tasks` | Una línea por tarea: specs, ruta, estado y commits |
| `## Log` | `L1` es la petición original; después se agregan decisiones, evidencia y correcciones con fecha |

Cuando cambia un requisito, se agrega una entrada al log y se reescribe solo el `S#` afectado.

## Git y entrega

- **Ramas:** `feat/<issue>-<tema>`, `fix/...`, `chore/...`, siempre desde `dev`. `main` recibe a `dev` por PR.
- **Commits:** Conventional Commits (`feat(invoices): ...`, `fix(http): ...`, `docs(odd): ...`), uno por unidad de trabajo, con sus tests y su documentación en el mismo commit.
- **Tamaño:** unas 400 líneas cambiadas por PR. Un cambio más grande se parte en **PRs encadenados**, cada uno contra la rama del anterior.
- **Al mergear una cadena:** cuando el PR padre entra a `dev`, cambia la base del hijo a `dev` antes de mergearlo (`gh pr edit <n> --base dev`). El repositorio no borra la rama al mergear, así que GitHub no hace ese cambio solo.
- **Verificación por slice:** cada PR de una cadena se prueba con solo su commit aplicado (`git stash --keep-index -u`).

## Revisión (RDD)

`gentle-ai review` evalúa el riesgo de cada commit (`review assess`). Los commits de riesgo alto (migraciones, concurrencia, seguridad, contratos públicos) pasan por una revisión de hasta 4 lentes: riesgo, resiliencia, legibilidad y confiabilidad. La revisión es informativa: la entrega la decide la persona, no la herramienta.

## Archivos locales que no se versionan

| Ruta | Por qué |
|---|---|
| `.env`, `bruno/.env` | Credenciales y conexiones locales |
| `src/generated/` | Cliente de Prisma generado |
| `*.tsbuildinfo` | Caché de `tsc` |
