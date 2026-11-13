# Errores de la API

Zyncro responde todos sus errores como [RFC 9457 Problem Details](https://www.rfc-editor.org/rfc/rfc9457) (`application/problem+json`). El campo `type` de cada problema apunta a una sección de esta página:

```json
{
  "type": "https://github.com/dev-eduardo-gomez/zyncro-api/blob/main/docs/errors.md#invoice-cancelled",
  "title": "Invoice is cancelled",
  "status": 409,
  "detail": "Cannot register a payment on a cancelled invoice.",
  "instance": "/invoices/8f14e45f-ceea-467f-a0e6-1b3c4d5e6f70/payments",
  "timestamp": "2026-11-13T16:00:00.000Z"
}
```

Tu cliente debe decidir con `type` y `status`. `title` es fijo para cada `type`, y `detail` explica el caso concreto: sirve para mostrarlo o registrarlo, no para compararlo.

Los errores HTTP que no tienen más significado que su código usan `type: "about:blank"`: `401` (sin token o con un token inválido), `403` (el rol no alcanza), `404` (el recurso no existe) y `500` (error interno; el detalle no expone información del servidor).

## validation

| `status` | `title` |
|---|---|
| `400` | `Request validation failed` |

El cuerpo, los parámetros de ruta o el query no cumplen el contrato: falta un campo obligatorio, un formato no es válido (fecha, UUID, monto decimal) o viene una propiedad que el contrato no declara. La extensión `errors` lista cada campo inválido:

```json
"errors": [
  { "field": "lineItems.0.quantity", "detail": "quantity must be a positive number" }
]
```

**Cómo resolverlo:** corrige los campos de `errors` y repite la solicitud.

## customer-duplicate-tax-id

| `status` | `title` |
|---|---|
| `409` | `Duplicate tax id` |

Ya existe un cliente con ese identificador fiscal (`taxId`). Ocurre al crear un cliente (`POST /customers`).

**Cómo resolverlo:** busca el cliente que ya existe y usa ese, o corrige el `taxId`.

## invoice-cancelled

| `status` | `title` |
|---|---|
| `409` | `Invoice is cancelled` |

Se intentó registrar un pago (`POST /invoices/{invoiceId}/payments`) sobre una factura cancelada. No se guarda nada: ni el pago, ni el saldo, ni el crédito del cliente.

**Cómo resolverlo:** registra el pago en otra factura vigente del cliente.

## maker-checker-violation

| `status` | `title` |
|---|---|
| `403` | `Maker-checker rule violated` |

Reservado para la segregación de funciones: quien registra una operación no puede aprobarla. Ninguna operación de la versión actual lo devuelve todavía.

## Otras reglas de negocio

Si una regla de negocio todavía no tiene su propia sección, la API responde `422` con `title: "Business rule violated"`, y su `type` termina en el código de la regla. Cada código nuevo agrega aquí su sección.
