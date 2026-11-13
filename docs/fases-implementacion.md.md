# Archivo: zyncro-fases-implementacion.md
# Hoja de Ruta Ampliada: 10 Fases End-to-End

## FASE 1: Monorepo Setup & Entorno Docker
* Configurar un monorepo con `pnpm workspaces` o `Nx` integrando `apps/backend` (NestJS), `apps/frontend` (Angular 17) y `libs/shared-dtos`.
* Crear el archivo `docker-compose.yml` local con PostgreSQL 16, Redis 7 y Mailpit (para testing de correos SMTP).

## FASE 2: Persistencia & Modelado Prisma (AR/AP)
* Diseñar el esquema declarativo en `prisma/schema.prisma` contemplando clientes, proveedores, facturas y comprobantes con precisión `Decimal(15,2)`.
* Ejecutar `pnpm prisma migrate dev` para sincronizar el estado de la base de datos de manera automatizada.

## FASE 3: Seguridad, Autenticación JWT & Manejo de Errores
* Implementar `AuthModule` en NestJS usando `@nestjs/jwt` y Passport para estrategias Bearer JWT stateless y RBAC.
* Crear un filtro global de excepciones en NestJS (`ProblemDetailsFilter`) para formatear todas las excepciones bajo el estándar RFC 9457 (Problem Details, sucesor de RFC 7807).
* Configurar `ThrottlerModule` integrado con Redis para protección contra fuerza bruta.

## FASE 4: Motor de Vencimientos Batch & Colas BullMQ
* Desarrollar un procesador de tareas con BullMQ (`@nestjs/bullmq`) y `@nestjs/schedule` para barrido nocturno de facturas en rangos T-5, T-2, T-0, T+3, T+7.
* Configurar el envío asíncrono de recordatorios mediante WhatsApp Business API y Email en background.

## FASE 5: Vision AI & Pipeline OCR de Comprobantes
* Integrar `@aws-sdk/client-s3` para la carga directa de comprobantes desde Angular mediante Presigned URLs.
* Desarrollar `AiVisionService` en NestJS usando Vercel AI SDK para extraer datos financieros en un esquema Zod validado.

## FASE 6: Frontend Angular 17 (Signals & Standalone)
* Inicializar la aplicación Angular 17 en arquitectura Standalone con Signals para reactividad de interfaz.
* Importar las interfaces de `libs/shared-dtos` directamente en los servicios de Angular.
* Construir el Dashboard Operativo y el Portal de Pago sin contraseña para clientes.

## FASE 7: WebSockets & Alertas en Tiempo Real
* Configurar `@nestjs/websockets` con Socket.io y adaptador de Redis (`redis-adapter`).
* Conectar el cliente Angular para recibir eventos instantáneos cuando un pago sea detectado y conciliado por la IA.

## FASE 8: Nginx Reverse Proxy & Unificación de Entorno
* Configurar Nginx para servir la aplicación cliente de Angular y redirigir `/api/*` hacia NestJS en el puerto 3000.
* Inyectar cabeceras HTTP de seguridad: `Strict-Transport-Security`, `X-Content-Type-Options`, `X-Frame-Options`.

## FASE 9: Capa Perimetral Cloudflare WAF & SSL
* Configurar la zona DNS en Cloudflare en modo Proxy (Nube Naranja).
* Habilitar WAF OWASP y SSL/TLS en modo Strict para cifrado continuo.

## FASE 10: CI/CD Pipeline & Despliegue Automático
* Configurar GitHub Actions (`.github/workflows/deploy.yml`) para ejecutar tests unitarios (`vitest` / `jest`), compilar NestJS/Angular y desplegar en servidor VPS vía SSH.