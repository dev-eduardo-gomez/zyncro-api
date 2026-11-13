# Documentación técnica de Zyncro API

Describe cómo está construida la API **hoy**: qué hay implementado, dónde vive cada cosa y qué reglas sigue. Qué es el producto, su finalidad y su alcance están en [Qué es Zyncro](../que-es-zyncro.md); para poner el proyecto en marcha, ver el [README](../../README.md) de la raíz.

## Qué hay implementado

| Área | Estado | Issue |
|---|---|---|
| Infraestructura local (Postgres, Redis, Mailpit) | ✅ | #1 |
| Modelo de cuentas por cobrar en Prisma | ✅ | #2 |
| Errores con Problem Details (RFC 9457) | ✅ | #3 |
| Autenticación JWT, roles y guards globales | ✅ | #4 |
| Contrato OpenAPI 3.1 validado en los tests | ✅ | #43 |
| Clientes (CRUD) | ✅ | #5 T1 |
| Facturas: emisión y consulta | ✅ | #5 T2 |
| Pagos: registro, sobrepago a crédito, listado | ✅ | #5 T3 |
| Listado de facturas con filtros y cursor | ✅ | #5 T4 |
| Recordatorios, `OVERDUE` automático | ⏳ | #8 |
| Bitácora de auditoría | ⏳ | #22 |

## Índice

| Documento | Léelo si quieres saber... |
|---|---|
| [01 · Arquitectura](01-arquitectura.md) | Cómo se organizan las capas, los módulos y el arranque, y qué variables de entorno hacen falta |
| [02 · Dominio: cuentas por cobrar](02-dominio-cuentas-por-cobrar.md) | Cómo se calculan los montos, los estados, los pagos y el listado |
| [03 · API HTTP y seguridad](03-api-http.md) | Qué endpoints existen, cómo funciona la autenticación, la validación y los errores |
| [04 · Persistencia](04-persistencia.md) | El modelo de datos, las migraciones y la transacción de pagos |
| [05 · Testing y calidad](05-testing-y-calidad.md) | Qué tipo de test va dónde y cómo se valida el contrato |
| [06 · Convenciones y flujo](06-convenciones-y-flujo.md) | Reglas de código, flujo API-first, ramas, commits y PRs |

## Ruta rápida para quien llega nuevo

1. Levanta el entorno con el [README](../../README.md) y corre `npm test`.
2. Lee [01 · Arquitectura](01-arquitectura.md) hasta "Recorrido de una request".
3. Abre `contracts/openapi.yaml` y prueba `Login` → `Create customer` → `Create invoice` → `Register payment` en Bruno (`bruno/`).
4. Lee [06 · Convenciones](06-convenciones-y-flujo.md) antes de tu primer commit.

## Glosario

| Término | Significado |
|---|---|
| **R1-R8** | Reglas de negocio de la issue #5 (precisión, redondeo, folio, pagos, sobrepago, duplicados, bitácora y paginación). Están en `odd/tasks/issue-5-accounts-receivable.md` |
| **Folio** | Número de factura único y creciente, asignado por una secuencia de Postgres |
| **`balance`** | Lo que falta pagar de una factura; baja con cada pago y nunca es negativo |
| **`creditBalance`** | Crédito a favor acumulado de un cliente por sobrepagos |
| **Estado derivado** | `PARTIAL` o `DUE_SOON`: se calcula al leer y no se guarda |
| **Puerto / adaptador** | Clase abstracta en el dominio y su implementación en infraestructura (por ejemplo, `InvoiceRepository` → `PrismaInvoiceRepository`) |
| **ODD** | Organic Driven Development: el flujo de trabajo con log en `odd/tasks/` |
