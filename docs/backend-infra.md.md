# Archivo: cobrix-backend-infra.md
# Especificación Técnica Backend, Base de Datos e Infraestructura

## 1. Stack Tecnológico Backend
* **Lenguaje & Runtime:** Node.js 20+ LTS / TypeScript 5.x.
* **Framework Backend:** NestJS 10+ (Inyección de dependencias, Módulos, Guards, Interceptors, Pipes).
* **ORM & Persistencia:** Prisma ORM con soporte nativo para `Decimal.js` y PostgreSQL 16 (`NUMERIC(15,2)`).
* **Colas & Procesamiento en Lote:** BullMQ (`@nestjs/bullmq`) respaldado por Redis 7 para Jobs asíncronos y barrido de vencimientos.
* **Seguridad & Autenticación:** `@nestjs/jwt`, Passport.js (Estrategia JWT Stateless, RBAC, Multitenancy).
* **Rate Limiting:** `@nestjs/throttler` integrado con Redis Storage.
* **Inteligencia Artificial:** Vercel AI SDK (`ai`) para extracción estructurada OCR Vision con esquemas `zod`.

## 2. Arquitectura de Módulos (NestJS)

| Módulo NestJS | Responsabilidad Principal | Dependencias / Librerías |
| :--- | :--- | :--- |
| **CoreModule** | Autenticación JWT, Guards de roles (RBAC), filtro global de excepciones Problem Details RFC 9457 (`ProblemDetailsFilter`) y `ValidationPipe` global, ThrottlerGuard. | `@nestjs/jwt`, `passport`, `@nestjs/throttler` |
| **ArModule (Cobrar)** | Gestión de clientes, emisión de facturas, generación de Magic Links y conciliación de ingresos. | PrismaService, MailerService |
| **ApModule (Pagar)** | Buzón de egresos, validación de proveedores, gestión de nóminas y flujo Maker-Checker con firmas internas. | PrismaService, SecurityService |
| **QueueModule (Batch)** | Procesadores BullMQ para Jobs programados (Cron), envío masivo de alertas WhatsApp/Email y vencimientos. | `@nestjs/bullmq`, Redis |
| **AiVisionModule** | Recepciona imágenes de comprobantes, invoca LLM Vision con salida estructurada Zod y realiza conciliación automática. | Vercel AI SDK, Zod, AWS S3 SDK |

## 3. Esquema de Base de Datos (Prisma Schema / PostgreSQL)

### 3.1. Modelo Cuentas por Cobrar (AR)
```prisma
model Customer {
  id           String    @id @default(uuid()) @db.Uuid
  taxId        String    @unique @map("tax_id") @db.VarChar(50)
  contactEmail String    @map("contact_email") @db.VarChar(100)
  invoices     Invoice[]
  @@map("customers")
}

model Invoice {
  id          String        @id @default(uuid()) @db.Uuid
  customerId  String        @map("customer_id") @db.Uuid
  totalAmount Decimal       @map("total_amount") @db.Decimal(15, 2)
  status      InvoiceStatus @default(PENDING)
  customer    Customer      @relation(fields: [customerId], references: [id])
  payments    Payment[]
  @@map("invoices")
}

model Payment {
  id          String   @id @default(uuid()) @db.Uuid
  invoiceId   String   @map("invoice_id") @db.Uuid
  paidAmount  Decimal  @map("paid_amount") @db.Decimal(15, 2)
  proofUrl    String?  @map("proof_url") @db.Text
  invoice     Invoice  @relation(fields: [invoiceId], references: [id])
  @@map("payments")
}

enum InvoiceStatus {
  PENDING
  PAID
  OVERDUE
  CANCELLED
}