# Dominio: cuentas por cobrar

Las reglas de negocio de clientes, facturas y pagos viven en funciones y tipos puros de `src/<módulo>/domain/`. No importan NestJS ni Prisma, así que se prueban sin base de datos y se pueden leer sin conocer el framework.

## Mapa rápido

| Concepto | Dónde vive | Qué decide |
|---|---|---|
| Cliente | `src/customers/domain/models/customer.ts` | Datos fiscales, días de crédito y crédito a favor (`creditBalance`) |
| Factura | `src/invoices/domain/models/invoice.ts` | Partidas, montos, folio, vencimiento, estado y saldo |
| Pago | `src/invoices/domain/models/payment.ts` | Cuánto se aplicó a la factura y cuánto fue a crédito |
| Montos | `services/calculate-invoice-amounts.ts` | Partidas, subtotal, impuesto y total (R2) |
| Vencimiento | `services/compute-due-date.ts` | Fecha de vencimiento a partir de los días de crédito |
| Estado derivado | `services/derive-invoice-status.ts` | `PARTIAL`, `DUE_SOON` o `null` |
| Reparto de un pago | `services/allocate-payment.ts` | Aplicado, crédito, nuevo saldo y nuevo estado (R4, R5) |

Los servicios están en `src/invoices/domain/services/`.

---

## Dinero

**Regla:** el dinero nunca es `number`. Viaja como texto decimal con dos decimales (`"1160.00"`) en el dominio y en la API, se calcula con `decimal.js` en base 10 y se guarda en Postgres como `DECIMAL(15,2)` (R1).

| Paso | Representación |
|---|---|
| Request / response | `string` con patrón `^\d+\.\d{2}$` |
| Dominio | `string`; los cálculos usan `Decimal` y regresan `toFixed(2, ROUND_HALF_UP)` |
| Base de datos | `DECIMAL(15,2)` (montos), `DECIMAL(12,4)` (cantidad), `DECIMAL(5,4)` (tasa) |
| Lectura desde Prisma | `Decimal.toFixed(2)`, nunca `toString()` (que da la forma mínima, `"0"` en vez de `"0.00"`) |

Cada redondeo pasa su modo de forma explícita. Ninguna función llama a `Decimal.set(...)`, porque esa configuración es global para todo el proceso.

## Montos de una factura (R2)

`calculateInvoiceAmounts(lineItems)` aplica, en este orden:

1. `lineTotal = round_half_up(quantity × unitPrice, 2)`, por partida.
2. `subtotal = Σ lineTotal`, exacto.
3. `tax = round_half_up(Σ (lineTotal × taxRate), 2)`, **una vez** por factura.
4. `total = subtotal + tax`, exacto.

Se redondea cada partida para que las partidas visibles sumen exactamente el subtotal. `quantity` y `taxRate` admiten hasta 4 decimales, y `taxRate` va de 0 a 1.

## Vencimiento

`computeDueDate(startDate, days)` devuelve `YYYY-MM-DD` sumando días en **UTC** (`setUTCDate`). La fecha de vencimiento es una fecha de calendario, no un instante. El resultado no depende de la zona horaria de la máquina, y las specs lo comprueban con `TZ=America/Mexico_City` y `TZ=Asia/Tokyo`.

## Estados

| Tipo | Valores | Dónde |
|---|---|---|
| Persistido (`status`) | `PENDING`, `PAID`, `OVERDUE`, `CANCELLED`, `DISPUTED` | Columna `invoices.status` |
| Derivado (`derivedStatus`) | `PARTIAL`, `DUE_SOON`, `null` | Se calcula al leer; no se guarda |

`deriveInvoiceStatus(invoice, today)`:

- **`DUE_SOON`**: `PENDING` y vence dentro de los próximos 5 días, incluido hoy (la ventana de recordatorios de #8).
- **`PARTIAL`**: se pagó algo pero no todo (`0 < balance < total`). Aplica a cualquier estado persistido, también `OVERDUE`.
- **Precedencia**: si aplican los dos, gana `DUE_SOON`, porque la fecha es el dato más urgente; `balance` frente a `total` sigue mostrando el pago parcial.

Las fechas `YYYY-MM-DD` se comparan como texto, porque con ceros a la izquierda el orden alfabético es el cronológico. Los montos **no**: se comparan con `Decimal.lessThan`/`greaterThan`.

**Quién escribe cada estado hoy:**

| Estado | Lo escribe |
|---|---|
| `PENDING` | La creación de la factura |
| `PAID` | Un pago que deja el `balance` en cero |
| `OVERDUE` | Nadie todavía; lo hará el barrido nocturno de #8 |
| `CANCELLED`, `DISPUTED` | Nadie todavía; no hay endpoint que los escriba |

## Pagos (R4, R5)

`allocatePayment(invoice, amount)` recibe el estado de la factura bajo bloqueo (`status`, `total`, `balance`) y decide:

| Situación | Resultado |
|---|---|
| Factura `CANCELLED` | Lanza `InvoiceCancelled` → 409 |
| `amount ≤ balance` | Todo se aplica; el estado se conserva, salvo que el `balance` llegue a 0 → `PAID` |
| `amount > balance` | Se aplica el `balance` y el excedente va a `creditAmount` (sobrepago, R5) → `PAID` |
| Factura `PAID` (`balance` 0) | `appliedAmount = 0.00`, todo a crédito |
| `OVERDUE` / `DISPUTED` | Mismas reglas que `PENDING` |

```
appliedAmount = min(amount, balance)
creditAmount  = amount − appliedAmount        ← la invariante amount = applied + credit se cumple por construcción
balance'      = balance − appliedAmount       ← nunca negativo
```

El `creditAmount` de cada pago se suma a `Customer.creditBalance`. Ese crédito todavía **no** se aplica solo a facturas futuras.

Un monto de `0.00` es un error de validación (400) y no llega al dominio.

## Listado (T4, en curso)

`InvoiceRepository.findPage` recibe `{ filter, afterFolio, limit }` y devuelve `{ items, nextFolio }`:

- **Orden:** `folio` descendente (la más nueva primero). `folio` es único y crece con cada factura.
- **Cursor:** el folio de la última factura de la página; la página siguiente pide `folio < cursor`. Una factura nueva recibe un folio mayor, así que nunca se mete en páginas que el cliente todavía no ha visto (R8).
- **Filtros** (`InvoiceFilter`): `status`, `customerId`, `dueDateFrom`/`dueDateTo`, `minTotal`/`maxTotal`. Todos son opcionales, se combinan con AND y los rangos incluyen ambos extremos. El rango de monto compara contra `total`, no contra `balance`.

## Errores de negocio

Los errores de dominio extienden `BusinessRuleViolation` (`src/shared/domain/errors/business-rule-violation.ts`) con un código estable. La capa HTTP los traduce a Problem Details con el catálogo (ver [API HTTP](03-api-http.md)).

| Error | Código | HTTP |
|---|---|---|
| `DuplicateTaxId` | `customer-duplicate-tax-id` | 409 |
| `InvoiceCancelled` | `invoice-cancelled` | 409 |

## Pendientes conocidos

- `OVERDUE`, `CANCELLED` y `DISPUTED` no tienen quien los escriba (ver la tabla de estados).
- R7 (bitácora de cada pago y cambio de estado) espera a #22.
- Reintentar un `POST` de pago registra el pago dos veces: no hay clave de idempotencia.
