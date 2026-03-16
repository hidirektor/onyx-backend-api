<picture>
  <source media="(prefers-color-scheme: dark)"  srcset="readme/logo_onyx_dark.png">
  <source media="(prefers-color-scheme: light)" srcset="readme/logo_onyx_light.png">
  <img alt="Onyx Logo" src="readme/logo_onyx_dark.png" height="72">
</picture>

# Onyx Backend API

Module-based REST API built with **Node.js**, **Express 5**, **Sequelize** (MySQL), **Redis**, **RabbitMQ**, **MinIO**, and **Socket.IO**.

## Stack

| Layer | Technology |
|---|---|
| Runtime | Node.js 20 |
| Framework | Express 5 |
| ORM | Sequelize 6 + MySQL / MariaDB |
| Cache | Redis (ioredis) |
| Queue | RabbitMQ (amqplib) |
| Storage | MinIO |
| Mail | Nodemailer via Resend SMTP |
| Real-time | Socket.IO |

## Getting Started

```bash
cp .env.example .env   # fill in your values
npm install
npm run dev
```

Health check: `GET /health`

## Docker

```bash
docker compose up -d
```

## Environment

See [`.env.example`](.env.example) for all required variables.

## Project Structure

```
app/
├── core/           # Infrastructure, configs, middleware, base classes
│   └── domain/     # Models, enums
├── modules/        # Feature modules (auth, ...)
├── services/       # Notification engine, migration service
└── shared/         # Utilities, static files
```

## License

ISC © [hidirektor](https://github.com/hidirektor)
