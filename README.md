# Zyncro API

Backend de **Zyncro**, un ERP financiero enfocado en automatizar Cuentas por Cobrar (AR), Cuentas por Pagar (AP) y Nómina. Construido con [NestJS](https://nestjs.com).

La documentación de producto vive en [`docs/`](docs/).

## Requisitos

| Herramienta                    | Para qué                          |
| ------------------------------ | --------------------------------- |
| Node.js + npm                  | Ejecutar la API y los tests       |
| Docker (con Docker Compose v2) | Levantar la infraestructura local |

## Arquitectura local

La API corre **en tu máquina**; la infraestructura corre en contenedores con Docker Compose. Todos los puertos se publican solo en `127.0.0.1`, así que no son accesibles desde la red.

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

| Servicio   | Imagen                    | Puerto local (default)     | Para qué                                          |
| ---------- | ------------------------- | -------------------------- | ------------------------------------------------- |
| `postgres` | `postgres:16-alpine`      | `15432` → `5432`           | Base de datos principal (fuente de verdad)        |
| `redis`    | `redis:7-alpine`          | `6379` → `6379`            | Rate limiting y colas de trabajos (BullMQ)        |
| `mailpit`  | `axllent/mailpit:v1.31.3` | `1025` (SMTP), `8025` (UI) | Atrapa los mails de desarrollo; nunca los entrega |

Los tres servicios tienen **healthcheck**, así que `docker compose ps` muestra `(healthy)` cuando están listos para recibir conexiones.

## Puesta en marcha

### 1. Instalar dependencias

```bash
npm install
```

### 2. Crear el archivo `.env`

```bash
# bash / Git Bash
cp .env.example .env

# PowerShell
Copy-Item .env.example .env
```

`.env` está ignorado por Git: guardá ahí tus valores locales y nunca lo commitees.

| Variable            | Obligatoria | Default | Uso                                  |
| ------------------- | ----------- | ------- | ------------------------------------ |
| `POSTGRES_DB`       | Sí          | —       | Nombre de la base de datos           |
| `POSTGRES_USER`     | Sí          | —       | Usuario de PostgreSQL                |
| `POSTGRES_PASSWORD` | Sí          | —       | Contraseña de PostgreSQL             |
| `POSTGRES_PORT`     | No          | `15432` | Puerto de PostgreSQL en tu máquina   |
| `REDIS_PORT`        | No          | `6379`  | Puerto de Redis en tu máquina        |
| `MAILPIT_SMTP_PORT` | No          | `1025`  | Puerto SMTP de Mailpit en tu máquina |
| `MAILPIT_UI_PORT`   | No          | `8025`  | Puerto de la UI web de Mailpit       |

> La sintaxis es `CLAVE=valor`. Si un puerto choca con algo que ya tenés instalado (por ejemplo, un PostgreSQL local en `5432`), cambiá solo el valor en tu `.env`.

### 3. Levantar la infraestructura

```bash
docker compose up -d --wait
docker compose ps
```

`--wait` hace que el comando espere a que los healthchecks pasen. Los tres servicios deben decir `Up (healthy)`.

### 4. Verificar cada servicio

```bash
# PostgreSQL: debe responder "accepting connections"
docker compose exec postgres sh -c 'pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"'

# Redis: debe responder PONG
docker compose exec redis redis-cli ping

# Mailpit: abrí la bandeja en el navegador
# http://127.0.0.1:8025
```

### 5. Levantar la API

```bash
npm run start:dev
```

## Comandos de infraestructura

| Comando                             | Qué hace                                                                  |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `docker compose up -d`              | Levanta todos los servicios en segundo plano                              |
| `docker compose up -d <servicio>`   | Levanta solo uno (`postgres`, `redis`, `mailpit`)                         |
| `docker compose ps`                 | Muestra el estado y el healthcheck de cada servicio                       |
| `docker compose logs -f <servicio>` | Sigue los logs de un servicio                                             |
| `docker compose stop`               | Detiene los contenedores sin borrarlos                                    |
| `docker compose down`               | Borra los contenedores; **los datos de PostgreSQL se conservan**          |
| `docker compose down -v`            | Borra contenedores **y volúmenes**: ⚠️ se pierden los datos de PostgreSQL |

**Persistencia:** solo PostgreSQL usa un volumen (`postgres_data`). Redis y Mailpit guardan datos efímeros, que se pierden al recrear sus contenedores.

## Tests

```bash
npm test             # tests unitarios y de contrato
npm run test:watch   # modo watch
npm run test:cov     # cobertura
npm run test:e2e     # tests end-to-end
```

`test/local-infrastructure.spec.ts` contiene los **tests de contrato** de la infraestructura: leen la configuración resuelta con `docker compose --env-file .env.example config` y verifican imágenes, puertos (solo en `127.0.0.1`), volúmenes y healthchecks. Necesitan el CLI de Docker disponible, pero no requieren los contenedores levantados ni tu `.env`.

## Otros comandos

| Comando              | Qué hace                   |
| -------------------- | -------------------------- |
| `npm run build`      | Compila a `dist/`          |
| `npm run start:prod` | Ejecuta la build compilada |
| `npm run lint`       | Lint con oxlint            |
| `npm run format`     | Formatea con Prettier      |

## Problemas frecuentes

| Síntoma                                        | Causa probable                                                                                   | Solución                                                         |
| ---------------------------------------------- | ------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------- |
| `bind: ... address already in use` al levantar | El puerto ya está ocupado en tu máquina                                                          | Cambiá el puerto en `.env` (`POSTGRES_PORT`, `REDIS_PORT`, etc.) |
| Cambiar un valor en `.env` no tiene efecto     | Sintaxis `CLAVE:valor` en vez de `CLAVE=valor`, o una variable exportada en tu shell que lo pisa | Usá `=`; revisá las variables de tu shell                        |
| Un servicio queda en `(health: starting)`      | Todavía está arrancando                                                                          | Esperá unos segundos y volvé a correr `docker compose ps`        |
| Un servicio queda `(unhealthy)`                | El healthcheck falla                                                                             | `docker compose logs <servicio>`                                 |
