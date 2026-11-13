# Propuesta de backlog V2 (derivada del diseño v1 en Pencil)

Estado: PUBLICADO el 2026-10-28 como #18–#33 (prefijo [V2], milestone "Versión 2"). V2-n = #(17+n). 2026-10-28: #18–#29 y #32 se reasignaron a "Versión 1" (vistas V3); en V2 quedan #30, #31 y #33.
Fuente: las 16 vistas del diseño original. V1 = issues #1–#13 (lo que define la API hoy).

## Orden de construcción
1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 11 → 12 → 13 → 14 → 15 → 16.
Primero el cliente y la factura enriquecidos: casi todas las vistas V2 (cartera, Magic Link, mesa, dashboard) leen esos campos.

---

### V2-1 · Dar identidad comercial al cliente
- **Vista:** 10 · Clientes · Perfil 360
- **Problema:** el cliente solo tiene `taxId` y `contactEmail`; el diseño identifica al cliente por razón social y opera con contactos y condiciones de crédito.
- **Alcance:** razón social, segmento (Corporativo, PyME, Gobierno), contactos múltiples con uno principal, condiciones comerciales (días de crédito, línea de crédito, método preferido, uso CFDI, moneda), bloqueo de crédito.
- **Fuera de alcance:** riesgo por IA, DSO y comportamiento de pago (V2-12).
- **Criterios:** un cliente bloqueado no puede recibir facturas nuevas (Problem Details); la línea de crédito usada se calcula con el saldo abierto; solo hay un contacto principal por cliente.
- **Depende de:** #5

### V2-2 · Enriquecer la factura con folio, desglose fiscal y estados derivados
- **Vistas:** 02 Cartera, 04 Portal, 10 Perfil
- **Problema:** la factura no tiene folio ni desglose; el diseño muestra subtotal, IVA 16 %, recargo por mora y estados Parcial / Por vencer / En disputa.
- **Alcance:** folio único secuencial, subtotal + IVA + recargo con total consistente, estado `DISPUTED`, estados derivados en la respuesta (Parcial, Por vencer).
- **Fuera de alcance:** timbrado CFDI real.
- **Criterios:** total = subtotal + IVA + recargo con precisión Decimal; el folio no se repite bajo concurrencia; una factura en disputa no entra a recordatorios.
- **Depende de:** #5, #8

### V2-3 · Consultar la cartera con filtros, orden y paginación
- **Vistas:** 02 Cartera · Data Grid, 08 Gestor de columnas
- **Alcance:** listado de facturas con filtros combinables (estado, días de mora, monto, segmento), orden, paginación por cursor, vistas guardadas por usuario, exportación CSV, acciones en lote (enviar recordatorio).
- **Fuera de alcance:** virtual scroll y atajos de teclado (frontend).
- **Criterios:** los filtros Y/O producen el mismo resultado que la consulta SQL equivalente; la paginación es estable al insertar facturas nuevas; la exportación respeta los filtros activos.
- **Depende de:** V2-1, V2-2

### V2-4 · Administrar usuarios, roles personalizados y permisos
- **Vistas:** 15 Roles y permisos, 16 Proyección por rol
- **Problema:** hoy hay tres roles fijos (#4); el diseño permite invitar usuarios, crear roles y una matriz de permisos.
- **Alcance:** invitar y desactivar usuarios, roles con permisos granulares (ver / crear / autorizar por módulo), proyección de vistas según permisos, MFA TOTP.
- **Fuera de alcance:** SSO corporativo.
- **Criterios:** un permiso retirado bloquea la acción en la siguiente petición; un usuario sin MFA no puede autorizar egresos; los roles MAKER/CHECKER/ADMIN siguen funcionando.
- **Depende de:** #4

### V2-5 · Registrar una bitácora de auditoría inmutable
- **Vista:** 14 Auditoría · Bitácora inmutable
- **Alcance:** eventos sellados con cadena de hash (SHA-256) y firma, filtros por módulo/actor/severidad, verificación de integridad, exportación de evidencia.
- **Criterios:** alterar un evento rompe la verificación de la cadena; los eventos no se pueden editar ni borrar por API; cada aprobación maker-checker genera un evento.
- **Depende de:** V2-4

### V2-6 · Cobrar con Magic Link sin registro
- **Vista:** 04 Portal de pago
- **Alcance:** enlace con token efímero por factura, portal público con desglose y conceptos, CLABE SPEI única por factura, pago con tarjeta, subida de comprobante (reutiliza #9).
- **Criterios:** un token vencido o usado responde Problem Details; el portal no expone datos de otras facturas; pagar por el portal registra el pago con la misma regla de `PAID`.
- **Depende de:** V2-2, #9

### V2-7 · Recibir webhooks de pago y monitorearlos
- **Vistas:** 05 Monitor de webhooks, 16 Proyección por rol
- **Alcance:** endpoints para webhooks de Stripe y STP/SPEI con firma verificada e idempotencia, registro de eventos, reintento de fallidos, feed en vivo, salud por integración.
- **Criterios:** un evento repetido no duplica pagos; una firma inválida se rechaza; solo roles con permiso pueden reintentar.
- **Depende de:** V2-6, V2-4

### V2-8 · Notificar en tiempo real el progreso de tareas
- **Vista:** 07 Centro de notificaciones
- **Alcance:** gateway WebSocket autenticado con JWT, progreso de jobs BullMQ, bandeja de notificaciones por usuario.
- **Criterios:** un usuario solo recibe sus notificaciones; una conexión sin JWT válido se rechaza; el progreso de un envío masivo se actualiza sin recargar.
- **Depende de:** #8, #10

### V2-9 · Gestionar la cobranza desde una mesa de trabajo
- **Vista:** 09 Cobranza · Mesa de gestión
- **Alcance:** promesas de pago (registrar, cumplir, reprogramar), historial de interacciones, playbooks de secuencia editables, cola priorizada por monto y mora.
- **Fuera de alcance:** score de probabilidad de pago con modelo de IA (propuesta aparte si se confirma).
- **Criterios:** una promesa vencida sin pago se marca incumplida; editar un playbook no altera secuencias ya en curso; la cola ordena de forma determinista.
- **Depende de:** V2-1, #8

### V2-10 · Enviar recordatorios por WhatsApp
- **Vista:** 09 Mesa de gestión (plantillas)
- **Alcance:** canal WhatsApp Business con plantillas aprobadas y variables, estados de entrega/lectura.
- **Criterios:** solo se usan plantillas aprobadas; un fallo de entrega queda registrado y reintentable.
- **Depende de:** #8, V2-7

### V2-11 · Conciliar con revisión humana
- **Vista:** 03 Auditoría OCR & Conciliación IA
- **Alcance:** extracción de conceptos (líneas), cola de documentos que requieren revisión por baja confianza, confirmación o corrección manual.
- **Criterios:** un documento bajo el umbral de confianza no se aplica sin revisión; la corrección manual queda auditada.
- **Depende de:** #9, V2-5

### V2-12 · Mostrar el dashboard ejecutivo
- **Vista:** 01 Dashboard ejecutivo
- **Alcance:** MRR/ARR, DSO, razón corriente, flujo de caja waterfall, rendimiento de canales, pipeline de vencimientos.
- **Criterios:** el DSO coincide con la fórmula documentada sobre los datos de prueba; mover una cuenta de etapa reprograma su secuencia.
- **Depende de:** V2-2, V2-9, #6

### V2-13 · Buscar y ejecutar comandos de forma global
- **Vista:** 06 Barra de comandos ⌘K
- **Alcance:** endpoint de búsqueda unificada (clientes, facturas, proveedores) respetando permisos.
- **Criterios:** los resultados excluyen lo que el usuario no puede ver; responde en menos de 200 ms con el dataset de prueba.
- **Depende de:** V2-1, V2-4

### V2-14 · Evaluar proveedores
- **Vista:** 13 Proveedores · Scorecard
- **Alcance:** alta y directorio de proveedores, documentos con vencimiento (32-D, REPSE), evaluación trimestral (cumplimiento, calidad, entrega).
- **Criterios:** un proveedor con documentos vencidos no puede recibir egresos nuevos.
- **Depende de:** #6

### V2-15 · Controlar presupuesto y centros de costo
- **Vista:** 11 Gastos · Presupuesto y aprobación
- **Alcance:** presupuesto por categoría y mes, centros de costo, reembolsos a empleados, alerta y bloqueo por exceso.
- **Criterios:** un egreso que excede el presupuesto requiere justificación; lo devengado se calcula solo con egresos aprobados.
- **Depende de:** #6

### V2-16 · Correr y dispersar la nómina
- **Vista:** 12 Nómina · Corrida y dispersión
- **Alcance:** corrida por periodo, incidencias, cálculo ISR/IMSS/Infonavit, autorización maker-checker, layout de dispersión SPEI.
- **Criterios:** la corrida no se dispersa sin autorización de un Checker distinto al que la creó; los totales cuadran contra el detalle.
- **Depende de:** #6, V2-4

---
Fuera del backlog: las landings LP y LP2 (no requieren backend).
