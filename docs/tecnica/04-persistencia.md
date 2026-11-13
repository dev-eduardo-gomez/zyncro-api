# Persistencia: PostgreSQL y Prisma

La base de datos es PostgreSQL 16, accedida con Prisma ORM a través del adaptador `@prisma/adapter-pg`. Solo los adaptadores de `infrastructure/persistence/` conocen a Prisma; el dominio recibe y devuelve sus propios tipos.

## Mapa rápido

| Pieza | Ruta |
|---|---|
| Schema | `prisma/schema.prisma` |
| Migraciones | `prisma/migrations/<timestamp>_<nombre>/migration.sql` |
| Cliente generado (no versionado) | `src/generated/prisma/` |
| `PrismaService` / `PrismaModule` | `src/shared/infrastructure/persistence/prisma/` |
| Adaptadores | `src/<módulo>/infrastructure/persistence/prisma-*-repository.ts` |

## Flujo de trabajo

```bash
npx prisma migrate dev --name <cambio>   # crea y aplica la migración en la base local
npx prisma generate                      # regenera el cliente en src/generated/prisma
npx prisma migrate status                # migraciones aplicadas vs. archivos
```

- `migrate status` compara **archivos de migración** contra el historial aplicado, no contra `schema.prisma`. Para ver diferencias reales entre la base y el schema: `npx prisma migrate diff --from-config-datasource --to-schema prisma/schema.prisma`.
- **Nunca edites una migración ya aplicada.** Prisma guarda su checksum y `migrate dev` la marcaría como modificada.
- Una columna `NOT NULL` sobre una tabla con filas se agrega en tres pasos dentro de la misma migración: `ADD COLUMN` nulable → `UPDATE` de relleno → `SET NOT NULL`. Así se hizo con `invoices.balance`, rellenado con `balance = total`.

## Modelo de datos

| Tabla | Modelo | Claves y restricciones relevantes |
|---|---|---|
| `users` | `User` | `email` único; `role` (`MAKER`, `CHECKER`, `ADMIN`) |
| `customers` | `Customer` | `tax_id` único (409 si se repite); `credit_balance DECIMAL(15,2)` default 0 |
| `invoices` | `Invoice` | `folio` único con secuencia; `balance`, `total`, `subtotal`, `tax` en `DECIMAL(15,2)`; `due_date DATE` |
| `invoice_line_items` | `InvoiceLineItem` | `@@unique(invoice_id, position)`; `ON DELETE CASCADE` |
| `payments` | `Payment` | `amount`, `applied_amount`, `credit_amount`; índice `(invoice_id, created_at)` |

Todas las claves primarias son UUID (`@default(uuid()) @db.Uuid`). Las columnas usan snake_case (`@map`) y los modelos usan camelCase.

## Decisiones de diseño

| Decisión | Por qué |
|---|---|
| **Folio con secuencia nativa de Postgres** (`@default(autoincrement())`) | Atómica por diseño: dos facturas emitidas a la vez no reciben el mismo folio (R3). Un contador en la aplicación sí podría repetirse. Puede dejar huecos si una transacción falla, y eso es aceptable. |
| **Partidas en su propia tabla**, no JSON | Se pueden consultar y ordenar. `position` conserva el orden en que se capturaron. |
| **Factura y partidas en una sola operación** (nested create) | Si una partida falla, no queda una factura sin partidas. |
| **`balance` como columna** | Se actualiza en la misma transacción que registra el pago; no hace falta sumar los pagos en cada lectura. |
| **`due_date` como `DATE`** | Es una fecha de calendario. Se escribe con `new Date('YYYY-MM-DD')` (medianoche UTC) y se lee con `toISOString().slice(0, 10)`. |

## Mapeo fila → dominio

Cada adaptador convierte la fila de Prisma al tipo del dominio de forma explícita:

- **Dinero:** `Decimal` → `toFixed(2)`.
- **Cantidad y tasa:** `Decimal` → `toNumber()`.
- **Fechas de calendario:** `Date` → `toISOString().slice(0, 10)`.
- **Partidas:** se arman campo por campo, sin spread, para no filtrar `id`, `invoiceId` ni `position` al dominio.
- **Relaciones:** cuando se pide `include`, el tipo de la fila es `Prisma.InvoiceGetPayload<{ include: { lineItems: true } }>`, no `Invoice`.

## Registrar un pago: transacción con bloqueo

`PrismaPaymentRepository.register(invoiceId, payment, allocate)` resuelve dos riesgos: dos pagos simultáneos y una escritura a medias.

```
BEGIN (prisma.$transaction interactiva)
  SELECT status, total, balance, customer_id
    FROM invoices WHERE id = $1 FOR UPDATE     ← bloquea la fila de la factura
  si no hay fila → return null (404)
  decision = allocate({ status, total, balance })  ← el dominio decide bajo el bloqueo
  INSERT payments (...)
  UPDATE invoices SET balance, status
  UPDATE customers SET credit_balance = credit_balance + creditAmount
COMMIT  (si allocate lanza un error, se hace ROLLBACK y no se escribe nada)
```

- El bloqueo es la **única** consulta en SQL crudo (`$queryRaw`). Regresa un **arreglo** de filas crudas con nombres en snake_case y dinero como `Decimal`; el genérico de `$queryRaw<T>` no convierte nada, solo le dice a TypeScript qué tipo esperar.
- El segundo pago concurrente espera el bloqueo y lee el `balance` ya actualizado. El spec de integración lo comprueba con dos `register` en paralelo.
- `findByInvoiceId` devuelve `null` si la factura no existe y `[]` si no tiene pagos (`invoice.findUnique` con `payments` ordenados por `createdAt`).

## Errores de Prisma que se traducen

| Código Prisma | Significado | Traducción |
|---|---|---|
| `P2002` | Violación de restricción única | `DuplicateTaxId` → 409 |
| `P2025` | Registro a actualizar no encontrado | `null` → 404 |

Se atrapa solo el código esperado y se relanza todo lo demás.

## Pendientes conocidos

- Un `:id` que no es UUID llega al `$queryRaw` de pagos y Postgres lo rechaza con un error (500).
- El orden de pagos por `createdAt` no tiene desempate (dos pagos en el mismo instante).
- El bloqueo del cliente se toma aunque el pago no genere crédito.
