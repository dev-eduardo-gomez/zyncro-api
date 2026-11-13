# Archivo: zyncro-documentacion-general.md
# Documentación General de Producto, Estrategia y Funcionalidades: Zyncro

## 1. Misión, Visión y Objetivos Estratégicos

* **Objetivo General:** Eliminar la carga operativa manual en la gestión financiera para empresas que manejan cientos o miles de clientes, automatizando de extremo a extremo el ciclo de cobranza, la conciliación bancaria y la dispersión de pagos.
* **Misión:** Transformar los procesos tradicionales de persecución de pagos e insumos financieros en operaciones digitales trazables, escalables y precisas mediante automatización e Inteligencia Artificial.
* **Visión:** Posicionarse como el estándar tecnológico líder en automatización operativa financiera y conciliación bancaria inteligente para empresas en crecimiento.

## 2. Resumen Ejecutivo del Producto
Zyncro es un ERP financiero enfocado en la automatización de **Cuentas por Cobrar (AR)**, **Cuentas por Pagar (AP)** y **Nómina**. Su núcleo combina motor de colas en segundo plano, integraciones bancarias mediante Webhooks/WebSockets y un pipeline de extracción OCR impulsado por Inteligencia Artificial para conciliar pagos de forma autónoma.

## 3. Funcionalidades Concretas del ERP

### 3.1. Gestión de Cobranza (AR - Accounts Receivable)
* **Ciclos de Recordatorio Batch:** Programación automatizada de alertas T-5, T-2, T-0, T+3, T+7 vía Email y WhatsApp API.
* **Magic Links:** Enlace directo de pago enviado al cliente sin necesidad de registro ni contraseña.
* **Conciliación Automática:** Motor OCR que lee transferencias o tickets subidos por clientes y matchea automáticamente contra facturas pendientes.

### 3.2. Cuentas por Pagar & Dispersión (AP - Accounts Payable)
* **Regla de Seguridad Maker-Checker:** Todo egreso o pago de nómina debe ser creado por un operador (Maker) y autorizado digitalmente por un supervisor (Checker) antes de la ejecución.
* **Validación de Proveedores:** Verificación automática de datos fiscales y cuenta bancaria de destino.
* **Flujo de Apertura de Insumos:** Registro de facturas de proveedores con extracción automática de montos e impuestos mediante IA.

### 3.3. Dashboards & Módulo de Inteligencia
* **Métricas Clave:** Indicadores en tiempo real de MRR/ARR, DSO (Días de Cobro Pendiente) y porcentaje de automatización.
* **Flujo de Caja Waterfall:** Gráfico dinámico de balance de ingresos vs. egresos previstos.
* **Pipeline Kanban de Vencimientos:** Tablero interactivo con arrastrar y soltar para mover cuentas entre etapas de mora.
* **Auditoría Trilateral (Three-Way Matching):** Módulo de revisión para contrastar Orden de Compra vs. Factura de Proveedor vs. Movimiento Bancario.