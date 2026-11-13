# Qué es Zyncro

**Zyncro es una plataforma de cobranza: ayuda a una empresa a controlar lo que sus clientes le deben y a cobrarlo a tiempo.** Hoy es una API backend que registra clientes, emite facturas con su cálculo de impuestos y vencimiento, recibe pagos (completos, parciales o de más) y mantiene el saldo de cada factura y el crédito a favor de cada cliente.

Este documento describe el proyecto **como es hoy** y hacia dónde va. Los documentos originales de [`docs/`](./) describen una visión más amplia (un ERP con cuentas por pagar y nómina) que se recortó el 2026-11-02; donde se contradicen, manda este.

---

## Giro

| | |
|---|---|
| **Sector** | Software financiero B2B (fintech de gestión) |
| **Nicho** | Cuentas por cobrar (*accounts receivable*, AR) y cobranza |
| **Modelo de uso** | Una sola empresa emisora usa la plataforma para su propia cartera de clientes. No es multi-empresa (*multi-tenant*). |
| **Referencia de producto** | Plataformas de cobranza como cobrix.co, pero sin atarse a los bancos de un país |
| **Forma** | API REST (NestJS + PostgreSQL). La interfaz de usuario queda fuera de este repositorio. |

## El problema

Una empresa que vende a crédito a cientos o miles de clientes pierde mucho tiempo en tareas manuales:

- **Saber quién debe qué.** Las facturas, los pagos parciales y los anticipos viven en hojas de cálculo que nadie mantiene igual.
- **Recordar a tiempo.** Avisarle a cada cliente antes y después del vencimiento depende de que alguien se acuerde.
- **Conciliar pagos.** Cuando llega una transferencia o un comprobante, alguien tiene que encontrar a qué factura corresponde.
- **Demostrar lo que pasó.** Sin un registro confiable, no hay evidencia de qué se cobró, qué se notificó ni quién cambió qué.

## Finalidad

**Quitarle a la empresa la carga operativa de la cobranza.** La meta es que la empresa solo intervenga en las excepciones: el ciclo de facturar, recordar, recibir y conciliar pagos debe ser automático, trazable y exacto al centavo.

### Objetivos

| Objetivo | Cómo se mide | Estado |
|---|---|---|
| **Una sola fuente de verdad de la cartera** | Cada factura sabe su total, su saldo y su estado sin cálculos externos | ✅ Cubierto |
| **Dinero exacto** | Ningún cálculo pierde centavos; el redondeo está documentado | ✅ Cubierto |
| **Cobrar sin perseguir a mano** | Recordatorios automáticos antes y después del vencimiento | ⏳ #8 |
| **Conciliar sin buscar a mano** | Los comprobantes se leen y se asocian a su factura; lo dudoso pasa a revisión humana | ⏳ #9 |
| **Trazabilidad completa** | Cada pago y cada cambio de estado queda en una bitácora que no se puede alterar | ⏳ #22 |
| **Adaptable a cualquier país** | Bancos y proveedores de pago detrás de puertos con adaptadores intercambiables | ⏳ #9, V2 |

---

## Qué hace hoy

Lo que un usuario autenticado puede hacer con la API hoy:

```
1. Iniciar sesión                → recibe un token (roles MAKER, CHECKER, ADMIN)
2. Registrar un cliente          → identificador fiscal, razón social, dirección, email, días de crédito
3. Emitir una factura            → partidas con cantidad, precio e impuesto
                                    el sistema calcula subtotal, impuesto y total,
                                    asigna un folio único y la fecha de vencimiento
4. Registrar pagos               → el pago baja el saldo de la factura
                                    · si la completa, la factura pasa a PAGADA
                                    · si sobra dinero, va al crédito a favor del cliente
                                    · una factura CANCELADA rechaza pagos
5. Consultar                     → cliente, factura (con estado "Parcial" o "Por vencer"),
                                    pagos de una factura
```

| Capacidad | Detalle |
|---|---|
| **Clientes** | Alta, consulta, listado y edición. Un identificador fiscal repetido se rechaza. |
| **Facturas** | Una moneda por factura, impuesto por partida, redondeo por partida, folio secuencial sin repetirse aunque se emitan varias a la vez. Son documentos internos: **no** se timbran ante una autoridad fiscal. |
| **Pagos** | Parciales, completos y sobrepagos. Dos pagos simultáneos sobre la misma factura no se pisan. |
| **Estados** | Pendiente, Pagada, Vencida, Cancelada y En disputa (guardados); Parcial y Por vencer (calculados al consultar). |
| **Seguridad** | Todo requiere token salvo el login; contraseñas con argon2id; errores con un formato estándar (RFC 9457). |
| **Listado de facturas** | Filtros combinables (estado, cliente, vencimiento, monto) y paginación por cursor: una factura nueva no hace que se salte ni se repita ninguna mientras recorres las páginas. |

### Lo que todavía no hace

| Falta | Consecuencia hoy | Dónde se resuelve |
|---|---|---|
| Marcar facturas vencidas | Una factura vencida sigue como Pendiente | #8 |
| Enviar recordatorios | La empresa avisa a sus clientes por fuera | #8 |
| Leer comprobantes | Los pagos se registran a mano | #9 |
| Cancelar o poner en disputa una factura | No hay endpoint que lo haga | Sin issue todavía |
| Aplicar el crédito a favor a facturas nuevas | El crédito se acumula pero no se usa solo | Mejora pendiente |
| Administrar usuarios | Los usuarios se crean directo en la base de datos | #21 |

---

## Alcance

### Versión 1: el núcleo operativo

Orden de construcción y estado:

| # | Qué entrega | Estado |
|---|---|---|
| #1-#4 | Infraestructura local, modelo de datos, errores estándar, autenticación y roles | ✅ |
| #43 | Contrato OpenAPI como fuente de verdad | ✅ |
| #5 | Clientes, facturas, pagos y listado | ✅ |
| #22 | Bitácora de auditoría inmutable | ⏳ |
| #21 | Administración de usuarios | ⏳ |
| #8 | Recordatorios por correo (T-5, T-2, T-0, T+3, T+7) y marcado de vencidas | ⏳ |
| #9 | Conciliación de comprobantes con OCR y revisión humana | ⏳ |
| #7 | Límite de peticiones (throttling) | ⏳ |
| #10 | Contenedor detrás de Nginx y Cloudflare | ⏳ |
| #12 | CI/CD | ⏳ |

### Versión 2: integraciones y análisis

Depende de proveedores externos o solo agrega análisis:

| # | Qué entrega |
|---|---|
| #23 | Portal de pago con Magic Link y confirmación por webhook |
| #27 | Recordatorios por WhatsApp |
| #29 | Métricas: DSO, MRR/ARR, antigüedad de saldos, flujo de caja |
| #35 | Facturación fiscal (CFDI 4.0) |
| #44 | Movimientos bancarios por *open banking* para conciliar |
| #45 | Prioridad de cobranza por riesgo, basada en reglas |

### Fuera de alcance

| Qué | Por qué |
|---|---|
| **Cuentas por pagar, proveedores y nómina** | El producto se enfocó en cobranza (2026-11-02). Se cerraron #6, #31, #33 y #41. |
| **Timbrado fiscal en V1** | Requiere contratar y validar un proveedor de certificación por país; se decide cuando haya mercado objetivo. Pasó a V2 (#35). |
| **Varias empresas en una instalación** | Confirmado: una sola empresa emisora. |
| **Contactos múltiples, segmentos, línea de crédito, exportación CSV, acciones en lote** | Recortado del alcance de #5 para V1. |

---

## Principios de producto

1. **El dinero es exacto o no es.** Montos en base 10, redondeo documentado, nunca un número de punto flotante.
2. **Todo deja rastro.** Lo que cambia el dinero o el estado de una factura debe poder auditarse (#22).
3. **Una empresa, bien servida.** Primero una instalación por empresa; multi-empresa no es objetivo.
4. **Sin amarrarse a un país.** Bancos, proveedores de pago y autoridades fiscales se conectan por puertos con adaptadores intercambiables.
5. **El contrato manda.** La API se diseña primero en `contracts/openapi.yaml`, y el código lo cumple.

## Nombres

El repositorio, el contrato y la API se llaman **Zyncro**. **Cobrix** fue el nombre de trabajo original, y todavía aparece en documentos históricos (`odd/`, los borradores de `docs/*.md.md`) y en la colección de Bruno. Son el mismo producto.

## Para seguir leyendo

| Si quieres saber... | Lee |
|---|---|
| Cómo está construido | [Documentación técnica](tecnica/README.md) |
| Cómo levantarlo | [README](../README.md) |
| La visión original completa | [`documentacion-general.md.md`](documentacion-general.md.md) |
| Las reglas exactas de cobranza | [Dominio: cuentas por cobrar](tecnica/02-dominio-cuentas-por-cobrar.md) |
