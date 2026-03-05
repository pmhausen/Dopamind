# Dopamind

**ADHD-friendly planning & productivity tool with gamification.**

Dopamind helps people with ADHD overcome decision paralysis by prioritizing tasks, suggesting time-blocked schedules, and rewarding progress through a gamification system.

> ⚠️ **Security Note:** `JWT_SECRET` and `ENCRYPTION_KEY` are **required** environment variables. The backend will refuse to start without them. See [Quick Start](#quick-start) below.

---

## Features

### 🏠 Home Dashboard
- **Calendar-synced day planning** — tasks are automatically scheduled into free time slots based on work hours and calendar events, so suggestions never conflict with appointments.
- **Quick stats** — completed tasks, open tasks, focus minutes at a glance.
- **Quick-add** — create tasks directly from the dashboard.
- **Clock in/out** — time tracking widget for fast access.
- **🔔 Notification bell** — persistent indicator for overdue and time-critical tasks.

### ✅ Task Management
- Priorities (High / Medium / Low) with color coding.
- Deadlines, subtasks, tags, and estimated time per task.
- Filter (All / Open / Done) and sort (Priority / Deadline / Created).
- Tasks created from emails retain their mail reference.

### 📅 Calendar (CalDAV)
- CalDAV integration (Nextcloud, iCloud, Google Calendar, etc.).
- Month view with day detail panel.
- **Full event CRUD** — create, edit, and delete events.
- Fallback to local storage when no CalDAV server is configured.

### 📧 Smart IMAP Inbox
- IMAP proxy — mails remain on the server, no local storage.
- Reply, archive, delete, tag directly from the UI.
- Key-tag filter — optionally show only mails tagged with a specific IMAP keyword.
- Folder navigation (Inbox, Sent, Drafts, Trash, Archive).
- SMTP send — compose and reply directly from Dopamind.

### ⏱️ Time Tracking
- Clock in/out with real-time session display.
- Break management (start/end breaks).
- **Absences** (Vacation, Sick, Child Sick, Compensatory Time) — **overdue task penalties are automatically suspended during recorded absences**.
- Weekly overview with target/actual comparison and balance calculation.

### 🎮 Gamification & Rewards
- **XP system** — earn experience for completed tasks and focus blocks.
- **Level system** with 10 titled ranks (Newcomer → Legendary Focus).
- **25+ Achievements** in three tiers (Small / Medium / Large).
- **Streak tracking** with multiplier bonuses.
- **Penalty protection** — no XP loss for overdue tasks during registered absences.
- Optional sound effects.

### 🌍 Internationalization
- German and English fully supported.
- Language toggle in the header.

### ⚙️ Settings
- General: Language, Theme (Light / Dark).
- Work Schedule: Start, End, Break duration, Work days.
- Mail: IMAP/SMTP configuration, key-tag filter.
- Calendar: CalDAV URL, credentials, calendar discovery.
- Gamification: XP system and sound effects toggle.
- Feature toggles: Enable/disable Mail, Calendar, Time Tracking, Gamification.
- Account: Profile editing, password change, account deletion.

---

## Tech Stack

| Layer      | Technology                                        |
|------------|---------------------------------------------------|
| Frontend   | React 18, React Router v6, Tailwind CSS 3         |
| Icons      | lucide-react                                      |
| State      | Context API + useReducer                          |
| Backend    | Express.js (Node.js)                              |
| Validation | express-validator                                 |
| Security   | helmet, express-rate-limit, bcrypt                |
| Database   | PostgreSQL 16                                     |
| Auth       | JWT + bcrypt                                      |
| Encryption | AES-256-GCM (credentials at rest)                 |
| Mail       | ImapFlow + Nodemailer                             |
| CalDAV     | Raw HTTP (PROPFIND, REPORT, PUT, DELETE)          |
| Deploy     | Docker Compose + Nginx                            |

## Architecture

```
┌────────────────────────────────────────┐
│  Browser (React SPA)                   │
│  ├── Contexts (App, Settings, Auth...) │
│  ├── Services (API Layer)              │
│  └── Pages (Home, Tasks, Calendar ...) │
└───────────┬────────────────────────────┘
            │ /api/*
┌───────────▼────────────────────────────┐
│  Express Backend (Port 4000)           │
│  ├── /api/auth        → JWT Auth       │
│  ├── /api/setup       → Setup wizard   │
│  ├── /api/user-data   → Settings       │
│  ├── /api/tasks       → Task CRUD      │
│  ├── /api/stats       → User stats     │
│  ├── /api/achievements→ Achievements   │
│  ├── /api/focus-blocks→ Focus blocks   │
│  ├── /api/mail        → IMAP/SMTP proxy│
│  ├── /api/calendar    → CalDAV/Local   │
│  ├── /api/admin       → User mgmt      │
│  └── /api/health      → Health check   │
└───────────┬────────────────────────────┘
            │
┌───────────▼────────────────────────────┐
│  PostgreSQL 16                         │
│  ├── users            (auth)           │
│  ├── user_data        (settings/JSONB) │
│  ├── tasks            (relational)     │
│  ├── subtasks         (relational)     │
│  ├── achievements     (relational)     │
│  ├── user_stats       (relational)     │
│  ├── focus_blocks     (relational)     │
│  ├── app_settings     (config)         │
│  └── audit_log        (security)       │
└────────────────────────────────────────┘
```

### Security Architecture

- **JWT** tokens signed with `JWT_SECRET` (required, server exits if missing)
- **AES-256-GCM** encryption for all stored credentials (IMAP/SMTP/CalDAV passwords) using `ENCRYPTION_KEY` (required, server exits if missing)
- **Rate limiting**: auth endpoints (20 req/15 min), general endpoints (300 req/15 min)
- **Helmet.js** for HTTP security headers
- **CORS** restricted to configured origins
- **Password policy**: minimum 8 characters, uppercase, lowercase, digit required
- **Audit log** for security-relevant actions

---

## Quick Start

### With Docker (recommended)

> **Before you start**, set the required secrets. Copy `.env.example` to `.env` and fill in at minimum `JWT_SECRET` and `ENCRYPTION_KEY`:

```bash
git clone https://github.com/Elmontag/Dopamind.git
cd Dopamind

# 1. Create your .env from the template
cp .env.example .env

# 2. Edit .env – set JWT_SECRET and ENCRYPTION_KEY (required!)
#    Generate secrets: openssl rand -hex 32
$EDITOR .env

# 3. Start all services
docker-compose up --build

# Frontend:  http://localhost:3000
# Backend:   http://localhost:4000
# Nginx:     http://localhost (port 80)
```

The **Setup Wizard** runs automatically on first start (before any user exists). It performs a system health check to verify the backend is reachable and secrets are configured, then guides you through creating the initial administrator account.

### Without Docker

```bash
# 1. Start PostgreSQL and create the database
createdb dopamind

# 2. Backend
cd backend
npm install
export JWT_SECRET="$(openssl rand -hex 32)"
export ENCRYPTION_KEY="$(openssl rand -hex 32)"
export DATABASE_URL="postgresql://user:pass@localhost:5432/dopamind"
node server.js

# 3. Frontend (new terminal)
cd frontend
npm install
npm start
```

---

## Production Deployment

### Environment Variables

Copy `.env.example` to `.env` and fill in all values. The variables marked **REQUIRED** will cause the backend to exit immediately if missing.

```env
# PostgreSQL
POSTGRES_USER=dopamind
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=dopamind

# Backend
DATABASE_URL=postgresql://dopamind:<strong-password>@postgres:5432/dopamind
JWT_SECRET=<random-secret-min-32-chars>          # REQUIRED
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=<random-secret-min-32-chars>      # REQUIRED
CORS_ORIGIN=https://your-domain.com
```

### Security Checklist

- [ ] Set a strong `JWT_SECRET` (at least 32 random characters — `openssl rand -hex 32`).
- [ ] Set a strong `ENCRYPTION_KEY` for encrypting stored mail/CalDAV credentials.
- [ ] Change default PostgreSQL credentials.
- [ ] Configure `CORS_ORIGIN` to your actual domain (no wildcards).
- [ ] Use HTTPS with a valid certificate (configure in Nginx).
- [ ] Run `docker-compose up -d` for background mode.
- [ ] Set up PostgreSQL backups (e.g. `pg_dump` cron job).

### Nginx (Production)

Update `nginx/default.conf` for your domain and add SSL:

```nginx
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl;
    server_name your-domain.com;

    ssl_certificate     /etc/ssl/certs/your-cert.pem;
    ssl_certificate_key /etc/ssl/private/your-key.pem;

    location / {
        proxy_pass http://frontend:3000;
    }

    location /api/ {
        proxy_pass http://backend:4000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

---

## Setup Wizard

On first startup (before any user account exists), Dopamind redirects to the Setup Wizard (`/setup`). The wizard:

1. **System Check** — verifies the backend is reachable and `JWT_SECRET` / `ENCRYPTION_KEY` are configured. If the backend is offline, a clear error message is shown with instructions.
2. **Welcome** — introduction screen.
3. **Admin Account** — create the initial administrator account (email, name, password with strength indicator).
4. **Confirm** — review and submit.

Once setup is complete, the wizard is permanently disabled. Additional users can be created via the Admin panel or (if enabled) self-registration.

---

## Data Migration

When upgrading from a version that stored task data as a JSONB blob (`app_state`), Dopamind automatically migrates each user's data to the new relational tables (`tasks`, `subtasks`, `achievements`, `user_stats`) on the next startup. The migration is **atomic per user** — if any step fails, the entire user's migration is rolled back and retried on the next startup.

---

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| GET | `/api/health` | Public | Health check (backend status, security keys, DB) |
| GET | `/api/setup/status` | Public | Check if setup is needed |
| POST | `/api/setup/complete` | Public | Complete initial setup |
| POST | `/api/auth/login` | Public | Login |
| POST | `/api/auth/register` | Public | Register (if enabled) |
| GET | `/api/auth/me` | JWT | Current user info |
| GET | `/api/tasks` | JWT | List tasks |
| POST | `/api/tasks` | JWT | Create task |
| PUT | `/api/tasks/:id` | JWT | Update task |
| DELETE | `/api/tasks/:id` | JWT | Delete task |
| GET | `/api/stats` | JWT | User statistics |
| GET | `/api/achievements` | JWT | User achievements |
| GET | `/api/focus-blocks` | JWT | Focus block history |
| GET/PUT | `/api/user-data/:type` | JWT | Settings/user data |
| GET/POST | `/api/mail/*` | JWT | IMAP/SMTP proxy |
| GET/POST | `/api/calendar/*` | JWT | CalDAV proxy |
| GET/POST/PUT/DELETE | `/api/admin/*` | JWT+Admin | User management |

---

## Troubleshooting

### Backend won't start
**Symptom:** Container exits immediately with `Missing required environment variable`.  
**Fix:** Set `JWT_SECRET` and `ENCRYPTION_KEY` in your `.env` file before running `docker-compose up`. See [Quick Start](#quick-start).

### Setup page shows "Backend not reachable"
**Symptom:** The Setup Wizard's System Check shows a red "Backend not reachable" error.  
**Fix:** The backend is not running or exited due to missing env vars. Check `docker-compose logs backend` for the exact error.

### "Too many requests" errors
**Symptom:** API returns 429.  
**Fix:** The auth endpoints are rate-limited to 20 requests per 15 minutes per IP. Wait and retry, or adjust the rate limit in `backend/server.js` for development.

### Database connection errors
**Symptom:** `Failed to initialize database` in backend logs.  
**Fix:** Ensure the PostgreSQL container is running and `DATABASE_URL` is correct.

---

## Contributing

We welcome feedback from the neurodiversity community! Feel free to open an issue or create a pull request.

---

## License

*Made with care for the ADHD Community.*

