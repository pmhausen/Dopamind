# Dopamind

**ADHD-friendly planning & productivity tool with gamification.**

Dopamind helps people with ADHD overcome decision paralysis by prioritizing tasks, suggesting time-blocked schedules, and rewarding progress through a gamification system.

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

| Layer      | Technology                                  |
|------------|---------------------------------------------|
| Frontend   | React 18, React Router v6, Tailwind CSS 3   |
| Icons      | lucide-react                                |
| State      | Context API + useReducer                    |
| Backend    | Express.js (Node.js)                        |
| Database   | PostgreSQL 16                               |
| Auth       | JWT + bcrypt                                |
| Mail       | ImapFlow + Nodemailer                       |
| CalDAV     | Raw HTTP (PROPFIND, REPORT, PUT, DELETE)    |
| Deploy     | Docker Compose + Nginx                      |

## Architecture

```
┌────────────────────────────────────────┐
│  Browser (React SPA)                   │
│  ├── Contexts (App, Settings, ...)     │
│  ├── Services (API Layer)              │
│  └── Pages (Home, Tasks, Calendar ...) │
└───────────┬────────────────────────────┘
            │ /api/*
┌───────────▼────────────────────────────┐
│  Express Backend (Port 4000)           │
│  ├── /api/auth     → JWT Auth          │
│  ├── /api/user-data → Settings/State   │
│  ├── /api/mail     → IMAP/SMTP Proxy  │
│  ├── /api/calendar → CalDAV/Local      │
│  └── /api/admin    → User Management  │
└───────────┬────────────────────────────┘
            │
┌───────────▼────────────────────────────┐
│  PostgreSQL 16 (User data, Auth)       │
│  IMAP / SMTP / CalDAV Server(s)       │
└────────────────────────────────────────┘
```

---

## Quick Start

### With Docker (recommended)

```bash
git clone https://github.com/Elmontag/Dopamind.git
cd Dopamind

# Start all services
docker-compose up --build

# Frontend:  http://localhost:3000
# Backend:   http://localhost:4000
# Nginx:     http://localhost (port 80)
```

### Without Docker

```bash
# 1. Start PostgreSQL and create the database
#    (adjust credentials as needed)
createdb dopamind

# 2. Backend
cd backend
npm install
DATABASE_URL="postgresql://user:pass@localhost:5432/dopamind" \
JWT_SECRET="your-secret-key" \
node server.js

# 3. Frontend (new terminal)
cd frontend
npm install
npm start
```

---

## Production Deployment

### Environment Variables

Create a `.env` file in the project root (used by `docker-compose`):

```env
# PostgreSQL
POSTGRES_USER=dopamind
POSTGRES_PASSWORD=<strong-password>
POSTGRES_DB=dopamind

# Backend
DATABASE_URL=postgresql://dopamind:<strong-password>@postgres:5432/dopamind
JWT_SECRET=<random-secret-min-32-chars>
JWT_EXPIRES_IN=24h
ENCRYPTION_KEY=<random-secret-for-credential-encryption>
CORS_ORIGIN=https://your-domain.com
ADMIN_EMAIL=admin@your-domain.com
ADMIN_PASSWORD=<initial-admin-password>

# Frontend
REACT_APP_API_URL=https://your-domain.com/api
```

### Security Checklist

- [ ] Set a strong `JWT_SECRET` (at least 32 random characters).
- [ ] Set a strong `ENCRYPTION_KEY` for encrypting stored mail/CalDAV credentials.
- [ ] Change default PostgreSQL credentials.
- [ ] Set `ADMIN_PASSWORD` on first start, then change it in the UI.
- [ ] Configure `CORS_ORIGIN` to your actual domain (no wildcards).
- [ ] Use HTTPS with a valid certificate (configure in Nginx).
- [ ] Run `docker-compose up -d` for background mode.
- [ ] Set up PostgreSQL backups (e.g. `pg_dump` cron job).

### Nginx (Production)

Update `nginx/default.conf` for your domain and add SSL:

```nginx
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

## Configuration

All user-facing settings are configured via the web UI under **Settings** (`/settings`):

1. **IMAP/SMTP** — configure for mail access.
2. **CalDAV** — configure for calendar sync (supports auto-discovery).
3. **Work Schedule** — set start/end times, break duration, work days.
4. **Feature Toggles** — enable/disable Mail, Calendar, Time Tracking, Gamification.
5. Optional: **Key Tag** — filter mails by a specific IMAP keyword.

---

## Contributing

We welcome feedback from the neurodiversity community! Feel free to open an issue or create a pull request.

---

## License

*Made with care for the ADHD Community.*
