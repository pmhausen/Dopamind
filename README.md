# Dopamind

Self-hosted task planning application with prioritisation assistance, energy-aware scheduling and gamification.

## Description

Dopamind is a web-based productivity tool designed for users who struggle with task overload, unclear priorities or maintaining a structured workday. It assigns tasks to time blocks based on priority and energy level, integrates with external IMAP and CalDAV servers, and tracks progress through a gamification system.

The application consists of a React frontend, a Node.js/Express backend, a PostgreSQL database, and an optional Nginx reverse proxy. All components are available as Docker images.

## Features

- Prioritisation assistant: one highlighted next-step task at a time
- Energy-level-based scheduling: tasks assigned to morning, midday or evening blocks based on their energy demand
- Automatic day and schedule structuring
- CalDAV integration for calendar synchronisation (optional)
- IMAP integration for email-to-task conversion (optional)
- Gamification: XP, 10 level ranks, 25+ achievements, streak multiplier
- Compassion Mode: absence logging suppresses XP penalties
- Self-hosted: no cloud dependency, no subscription
- AES-256-GCM encryption for stored IMAP and CalDAV credentials
- Setup wizard on first start

## Requirements

- Docker and Docker Compose (recommended), or
- Node.js >= 18, PostgreSQL >= 14

## Quick Start (Docker)

```bash
git clone https://github.com/Elmontag/Dopamind.git
cd Dopamind
cp .env.example .env
# Edit .env: set JWT_SECRET and ENCRYPTION_KEY
# Generate values: openssl rand -hex 32
docker-compose up --build
```

Services after startup:
- Frontend: http://localhost:3000
- Backend API: http://localhost:4000
- Nginx proxy: http://localhost

The setup wizard runs automatically on first start.

## Quick Start (without Docker)

```bash
# PostgreSQL must be running
createdb dopamind

# Backend
cd backend
npm install
export JWT_SECRET="$(openssl rand -hex 32)"
export ENCRYPTION_KEY="$(openssl rand -hex 32)"
export DATABASE_URL="postgresql://user:pass@localhost:5432/dopamind"
node server.js

# Frontend (separate terminal)
cd frontend
npm install
npm start
```

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `JWT_SECRET` | Yes | JWT signing key, minimum 32 characters |
| `ENCRYPTION_KEY` | Yes | Key for AES-256-GCM encryption of stored credentials |
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `JWT_EXPIRES_IN` | No | Token expiry, default `24h` |
| `CORS_ORIGIN` | No | Allowed origin for CORS, set to your domain in production |
| `POSTGRES_USER` | No | PostgreSQL user (Docker Compose) |
| `POSTGRES_PASSWORD` | No | PostgreSQL password (Docker Compose) |
| `POSTGRES_DB` | No | PostgreSQL database name (Docker Compose) |

## Security

- Set strong random values for `JWT_SECRET` and `ENCRYPTION_KEY` before first start.
- Change default PostgreSQL credentials.
- Set `CORS_ORIGIN` to your actual domain in production.
- Use HTTPS with a valid certificate in production.
- Configure regular PostgreSQL backups.

## License

MIT
