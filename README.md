<div align="center">

# Zyncro API

**API de cuentas por cobrar para empresas que venden a crédito.**
Emite facturas, controla saldos, registra pagos parciales y convierte los sobrepagos en crédito a favor, con precisión al centavo.

[![NestJS](https://img.shields.io/badge/NestJS_12-E0234E?style=for-the-badge&logo=nestjs&logoColor=white)](https://nestjs.com/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL_16-4169E1?style=for-the-badge&logo=postgresql&logoColor=white)](https://www.postgresql.org/)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://www.prisma.io/)
[![OpenAPI](https://img.shields.io/badge/OpenAPI_3.1-6BA539?style=for-the-badge&logo=openapiinitiative&logoColor=white)](contracts/openapi.yaml)

[Qué es Zyncro](docs/que-es-zyncro.md) · [Documentación técnica](docs/tecnica/README.md) · [Contrato de la API](contracts/openapi.yaml)

</div>

---

## 💡 ¿Qué es Zyncro?

Zyncro es el backend de una plataforma de cobranza B2B para **una empresa emisora**. Reemplaza las hojas de cálculo con una sola fuente de verdad para la cartera: quién debe qué, desde cuándo y cuánto ha pagado.

- 🧾 **Facturas con cálculo automático:** partidas con cantidad, precio e impuesto; el servidor calcula subtotal, impuesto y total, asigna un **folio único y secuencial** a cada factura y la fecha de vencimiento según los días de crédito del cliente.
- 💳 **Pagos flexibles:** completos, parciales y sobrepagos. El excedente se guarda como **crédito a favor** del cliente. Dos pagos simultáneos sobre la misma factura no se pisan.
- 📊 **Estados claros:** `PENDING`, `PAID`, `OVERDUE`, `CANCELLED` y `DISPUTED`, más los estados calculados `PARTIAL` y `DUE_SOON` en cada consulta.
- 🎯 **Dinero exacto:** cero puntos flotantes. Los montos viajan como texto decimal, se calculan en base 10 y el redondeo está documentado.
- 🔒 **Seguro por defecto:** todas las rutas requieren JWT salvo el login, las contraseñas se guardan con argon2id y los errores siguen un formato estándar ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)).

> Las facturas son documentos internos: Zyncro **no** timbra ante una autoridad fiscal en la versión 1. Más detalles en [Qué es Zyncro](docs/que-es-zyncro.md).

---

## 🛠️ Stack

| Área | Tecnología |
|---|---|
| Framework | [NestJS 12](https://nestjs.com/) · TypeScript (ES modules) |
| Base de datos | [PostgreSQL 16](https://www.postgresql.org/) · [Prisma ORM 7](https://www.prisma.io/) |
| Dinero | [`decimal.js`](https://mikemcl.github.io/decimal.js/) |
| Seguridad | JWT (Passport) · argon2id |
| Contrato | OpenAPI 3.1, **contrato primero**, validado en cada test e2e |
| Tests y calidad | Vitest · Supertest · AJV · oxlint · Redocly |
| Infraestructura local | Docker Compose: PostgreSQL, Redis y Mailpit |

La arquitectura es hexagonal (puertos y adaptadores): las reglas de negocio viven en un dominio puro, sin NestJS ni Prisma. Ver [Arquitectura](docs/tecnica/01-arquitectura.md).

---

## 🚀 Requisitos

| Herramienta | Versión | Para qué |
|---|---|---|
| Node.js | 22 LTS o superior | Ejecutar la API y los tests |
| npm | La que trae Node | Dependencias (`package-lock.json`) |
| Docker | Con Docker Compose v2 | Levantar PostgreSQL, Redis y Mailpit |

---

## 📦 Puesta en marcha

La API corre **en tu máquina**; la infraestructura corre en contenedores. Todos los puertos se publican solo en `127.0.0.1`, así que no son accesibles desde la red.

```
┌──────────────── tu máquina ────────────────┐
│                                            │
│   NestJS (npm run start:dev)               │
│     │            │             │           │
│     ▼            ▼             ▼           │
│  127.0.0.1    127.0.0.1     127.0.0.1      │
│   :15432        :6379         :1025        │
│ ┌─────────┐  ┌─────────┐  ┌─────────────┐  │
│ │Postgres │  │  Redis  │  │   Mailpit   │──┼─▶ UI web :8025
│ │   16    │  │    7    │  │ (SMTP falso)│  │
│ └─────────┘  └─────────┘  └─────────────┘  │
│        contenedores (docker compose)       │
└────────────────────────────────────────────┘
```

### 1. Clonar e instalar

```bash
git clone https://github.com/dev-eduardo-gomez/zyncro-api.git
cd zyncro-api
npm install
```

### 2. Crear el archivo `.env`

```bash
# bash / Git Bash
cp .env.example .env

# PowerShell
Copy-Item .env.example .env
```

`.env` está ignorado por Git: guarda ahí tus valores locales y nunca lo subas al repositorio.

| Variable | Obligatoria | Default | Uso |
|---|---|---|---|
| `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD` | Sí | — | Base de datos que crea Docker |
| `DATABASE_URL` | Sí | — | Conexión de la API (debe coincidir con las tres anteriores y con `POSTGRES_PORT`) |
| `JWT_SECRET` | Sí | — | Firma de los tokens |
| `JWT_EXPIRES_IN` | Sí | `900` en el ejemplo | Vigencia del token, en segundos |
| `POSTGRES_PORT` | No | `15432` | Puerto de PostgreSQL en tu máquina |
| `REDIS_PORT` | No | `6379` | Puerto de Redis en tu máquina |
| `MAILPIT_SMTP_PORT` / `MAILPIT_UI_PORT` | No | `1025` / `8025` | Puertos de Mailpit |
| `PORT` | No | `3000` | Puerto HTTP de la API |
| `OBSERVE_APP_KEY` / `OBSERVE_APP_SECRET` | No | — | Telemetría con NestJS Observe; van juntas o ninguna |

> La API valida su configuración al arrancar: si falta `DATABASE_URL`, `JWT_SECRET` o `JWT_EXPIRES_IN`, se detiene con un error que dice cuál.

### 3. Levantar la infraestructura

```bash
docker compose up -d --wait
docker compose ps        # los tres servicios deben decir "Up (healthy)"
```

### 4. Preparar la base de datos

```bash
npx prisma migrate dev   # aplica las migraciones
npx prisma generate      # genera el cliente en src/generated/prisma
```

### 5. Crear tu primer usuario

Todavía no hay un endpoint para administrar usuarios (#21), así que el primero se crea a mano. Los pasos están en [`bruno/README.md`](bruno/README.md#creating-a-user-to-log-in-with).

### 6. Levantar la API

```bash
npm run start:dev
```

La API queda en `http://localhost:3000`. Para comprobarlo:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"tu@correo.com","password":"tu-contraseña"}'
```

---

## 📚 API

Zyncro sigue un enfoque de **contrato primero**: [`contracts/openapi.yaml`](contracts/openapi.yaml) es la fuente de verdad, y cada respuesta de los tests e2e se valida contra él. La API no expone Swagger UI; para explorarla puedes abrir el contrato en cualquier visor de OpenAPI o usar la colección de [Bruno](https://www.usebruno.com/) en [`bruno/`](bruno/).

| Método | Ruta | Descripción |
|---|---|---|
| `POST` | `/auth/login` | Inicia sesión y devuelve un token Bearer (ruta pública) |
| `GET` | `/auth/me` | Devuelve el usuario del token (id, email, rol) |
| `POST` | `/customers` | Registra un cliente; un identificador fiscal repetido responde `409` |
| `GET` | `/customers` | Lista los clientes |
| `GET` · `PATCH` | `/customers/{customerId}` | Consulta o actualiza un cliente |
| `POST` | `/invoices` | Emite una factura con sus partidas, impuestos, folio y vencimiento |
| `GET` | `/invoices/{invoiceId}` | Consulta una factura con su saldo y su estado |
| `POST` | `/invoices/{invoiceId}/payments` | Registra un pago: parcial, completo o con sobrepago; `409` si la factura está cancelada |
| `GET` | `/invoices/{invoiceId}/payments` | Lista los pagos de una factura, del más antiguo al más reciente |
| `GET` | `/invoices` | 🚧 Listado con filtros y paginación por cursor (en construcción) |

Los errores responden como `application/problem+json`. Detalle completo en [API HTTP y seguridad](docs/tecnica/03-api-http.md).

---

## 🧪 Tests

| Comando | Qué corre | Necesita |
|---|---|---|
| `npm test` | Unit: dominio, casos de uso y configuración de Docker Compose | CLI de Docker |
| `npm run test:int` | Integración de los repositorios con PostgreSQL real | Infraestructura arriba y migraciones aplicadas |
| `npm run test:e2e` | La API completa por HTTP, validada contra el contrato | Infraestructura arriba y `.env` completo |
| `npm run test:cov` | Unit con cobertura | — |
| `npm run lint` | oxlint | — |
| `npm run contract:lint` | Valida `contracts/openapi.yaml` | — |

Más detalle en [Testing y calidad](docs/tecnica/05-testing-y-calidad.md).

---

## 🧰 Comandos útiles

| Comando | Qué hace |
|---|---|
| `npm run start:dev` | API en modo desarrollo (recarga al guardar) |
| `npm run build` · `npm run start:prod` | Compila a `dist/` y ejecuta la build |
| `docker compose up -d <servicio>` | Levanta solo `postgres`, `redis` o `mailpit` |
| `docker compose logs -f <servicio>` | Sigue los logs de un servicio |
| `docker compose stop` | Detiene los contenedores sin borrarlos |
| `docker compose down` | Borra los contenedores; **los datos de PostgreSQL se conservan** |
| `docker compose down -v` | Borra contenedores **y volúmenes**: ⚠️ se pierden los datos de PostgreSQL |
| `npx prisma studio` | Explorador visual de la base de datos |

Solo PostgreSQL usa un volumen (`postgres_data`). Redis y Mailpit guardan datos efímeros. Hoy la API usa solo PostgreSQL; Redis y Mailpit quedan listos para el límite de peticiones y los recordatorios.

---

## 🗺️ Roadmap de la versión 1

- [x] Infraestructura local, modelo de datos y errores estándar (#1, #2, #3)
- [x] Autenticación JWT y roles `MAKER`, `CHECKER`, `ADMIN` (#4)
- [x] Contrato OpenAPI como fuente de verdad (#43)
- [x] Clientes, facturas y pagos (#5)
- [ ] Listado de facturas con filtros y paginación por cursor (#5)
- [ ] Bitácora de auditoría inmutable (#22)
- [ ] Administración de usuarios (#21)
- [ ] Recordatorios de vencimiento por correo y marcado de facturas vencidas (#8)
- [ ] Conciliación de comprobantes con OCR y revisión humana (#9)
- [ ] Límite de peticiones con Redis (#7)
- [ ] Contenedor detrás de Nginx y Cloudflare (#10)
- [ ] CI/CD (#12)

La versión 2 (portal de pago con Magic Link, WhatsApp, métricas, facturación fiscal CFDI 4.0, open banking) está descrita en [Qué es Zyncro](docs/que-es-zyncro.md#versión-2-integraciones-y-análisis).

---

## 🤝 Cómo contribuir

1. Crea tu rama desde `dev`: `feat/<issue>-<tema>`, `fix/...` o `chore/...`.
2. Si cambias la API, empieza por el contrato (`contracts/openapi.yaml`) y los tests; después el código.
3. Haz commits con [Conventional Commits](https://www.conventionalcommits.org/es/v1.0.0/) (`feat(invoices): ...`), con sus tests en el mismo commit.
4. Antes del PR: `npm test`, `npm run test:int`, `npm run test:e2e`, `npm run lint` y `npx tsc --noEmit` en verde.
5. Abre el PR contra `dev`. Si pasa de unas 400 líneas, divídelo en PRs encadenados.

Las reglas completas están en [Convenciones y flujo](docs/tecnica/06-convenciones-y-flujo.md).

---

## 🩺 Problemas frecuentes

| Síntoma | Causa probable | Solución |
|---|---|---|
| `bind: ... address already in use` al levantar | El puerto ya está ocupado en tu máquina | Cambia el puerto en `.env` (`POSTGRES_PORT`, `REDIS_PORT`, etc.) |
| `JWT_SECRET is not set` u otro error de configuración al arrancar | Falta una variable obligatoria en `.env` | Compara tu `.env` con `.env.example` |
| `Can't reach database server` | La infraestructura no está arriba, o `DATABASE_URL` no coincide con `POSTGRES_PORT` | `docker compose ps` y revisa el puerto de `DATABASE_URL` |
| Un cambio en `.env` no tiene efecto | Sintaxis `CLAVE:valor` en vez de `CLAVE=valor`, o una variable de tu shell que lo pisa | Usa `=` y revisa las variables de tu shell |
| Un servicio queda en `(health: starting)` | Todavía está arrancando | Espera unos segundos y vuelve a correr `docker compose ps` |
| Un servicio queda `(unhealthy)` | El healthcheck falla | `docker compose logs <servicio>` |

---

## 📝 Licencia

Todavía no se ha definido una licencia (`package.json` declara `UNLICENSED`). Hasta que se publique una, todos los derechos quedan reservados por su autor.
