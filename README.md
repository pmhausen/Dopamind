# Dopamind – ADHD Planning Support WebTool

Dopamind ist ein intelligentes Planungs-Tool, das speziell für die Bedürfnisse von Menschen mit ADHS entwickelt wurde. Es minimiert den "Decision Paralysis"-Effekt, indem es Aufgaben priorisiert, Zeitbedarfe prognostiziert und durch ein Rewards-System Dopamin-Kicks für erledigte Aufgaben liefert.

---

## Key Features

### Smart IMAP Inbox
- **IMAP-Proxy:** Mails verbleiben auf dem Server – kein lokales Speichern.
- **Antworten, Archivieren, Löschen, Taggen** direkt aus der Mailübersicht.
- **Schlüsseltag-Filter:** Optional nur Mails mit einem definierbaren IMAP-Keyword anzeigen. So können Mails auch aus anderen Clients für Dopamind markiert werden.
- **Ordner-Navigation:** Inbox, Gesendet, Entwürfe, Papierkorb, Archiv.
- **SMTP-Versand:** Mails direkt aus Dopamind versenden und beantworten.

### Kalender (CalDAV)
- **CalDAV-Integration:** Sync mit Nextcloud, iCloud, Google Calendar u.a.
- **Monatsansicht** mit Tagesdetail-Panel.
- **Event-CRUD:** Termine erstellen, bearbeiten, löschen.
- **Fallback:** Lokale Speicherung wenn kein CalDAV konfiguriert ist.

### Aufgabenverwaltung
- **Prioritäten:** Hoch / Mittel / Niedrig mit farblicher Kennzeichnung.
- **Filter:** Alle, Offen, Erledigt.
- **Schnellanlage** direkt vom Home-Dashboard.
- **Geschätzte Bearbeitungszeit** pro Aufgabe.

### Home-Dashboard
- **Tagesübersicht:** Heutige Aufgaben und Termine auf einen Blick.
- **Quick Stats:** Erledigte Aufgaben, offene Aufgaben, Fokusminuten, Arbeitszeit.
- **Schnellanlage:** Neue Aufgaben direkt vom Dashboard anlegen.
- **Tagesplanungsvorschlag:** Automatische Verteilung von Aufgaben in freie Zeitfenster basierend auf Arbeitszeiten und Terminen.
- **Ein-/Ausstempeln:** Arbeitszeiterfassung direkt vom Dashboard.
- **Fokus-Timer:** Pomodoro-artiger Timer mit XP-Belohnung.

### Zeiterfassung (Stempeluhr 2.0)
- **Ein-/Ausstempeln** mit Echtzeit-Anzeige der laufenden Sitzung.
- **Pausen-Management:** Pausen starten und beenden.
- **Abwesenheiten:** Urlaub, Krank, Kindkrank, Freizeitausgleich.
- **Wochenübersicht:** Soll/Ist-Vergleich mit Saldo-Berechnung.
- **Zeitprotokoll:** Alle Einträge mit Löschmöglichkeit.

### Gamification & Rewards
- **XP-System:** Erfahrungspunkte für erledigte Aufgaben und Fokus-Blöcke.
- **Level-System:** Aufstieg durch gesammelte XP.
- **Achievements:** Hat-Trick (3 Aufgaben), Fokus-Streak, Level-Up.
- **Sound-Effekte:** Optional aktivierbar.

### Mehrsprachigkeit (i18n)
- **Deutsch** und **Englisch** vollständig unterstützt.
- Sprachauswahl in den Einstellungen.

### Einstellungen
- **Allgemein:** Sprache, Theme (Hell/Dunkel).
- **Gamification:** XP-System und Sound-Effekte ein/aus.
- **Arbeitszeiten:** Start, Ende, Pausendauer, Arbeitstage.
- **Mail-Filter:** Schlüsseltag aktivieren/deaktivieren mit konfigurierbarem Tag-Namen.
- **IMAP:** Server, Port, TLS, Zugangsdaten.
- **SMTP:** Server, Port, Zugangsdaten.
- **CalDAV:** URL, Zugangsdaten.

### Design & Accessibility
- **Responsive WebApp:** Desktop-Sidebar + Mobile-Bottom-Navigation.
- **Dark/Light Mode:** Sanfte Kontraste, Glassmorphism-Design.
- **Minimalistic UI:** Fokus auf das Wesentliche.

---

## Tech Stack

| Schicht    | Technologie                                 |
|------------|---------------------------------------------|
| Frontend   | React 18, React Router v6, Tailwind CSS 3   |
| Icons      | lucide-react                                |
| State      | Context API + useReducer                    |
| Backend    | Express.js (IMAP/SMTP/CalDAV Proxy)        |
| IMAP       | ImapFlow                                    |
| SMTP       | Nodemailer                                  |
| CalDAV     | Raw HTTP (PROPFIND, REPORT, PUT, DELETE)    |
| Deploy     | Docker Compose + Nginx                      |

## Architektur

```
┌─────────────────────────────────────┐
│  Browser (React SPA)                │
│  ├── Contexts (App, Settings, ...)  │
│  ├── Services (API Layer)           │
│  └── Pages (Home, Tasks, ...)       │
└──────────┬──────────────────────────┘
           │ /api/*
┌──────────▼──────────────────────────┐
│  Express Backend (Port 4000)        │
│  ├── /api/mail   → IMAP/SMTP       │
│  ├── /api/calendar → CalDAV/Local   │
│  └── /api/health                    │
└──────────┬──────────────────────────┘
           │
┌──────────▼──────────────────────────┐
│  IMAP / SMTP / CalDAV Server        │
└─────────────────────────────────────┘
```

## Schnellstart

```bash
# Klonen
git clone https://github.com/Elmontag/Dopamind.git
cd Dopamind

# Mit Docker starten
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
# Nginx:    http://localhost:80
```

### Ohne Docker

```bash
# Backend
cd backend && npm install && node server.js

# Frontend (neues Terminal)
cd frontend && npm install && npm start
```

## Konfiguration

Alle Einstellungen werden über die Web-Oberfläche unter `/settings` vorgenommen und im Browser-LocalStorage gespeichert:

1. **IMAP/SMTP** konfigurieren für Mailzugriff
2. **CalDAV** konfigurieren für Kalendersync
3. **Arbeitszeiten** einstellen für Tagesplanung
4. Optional: **Schlüsseltag** aktivieren für Mail-Filterung

---

## Contributing

Wir freuen uns über Feedback von der Neurodiversitäts-Community! Eröffne gerne ein Issue oder erstelle einen Pull-Request.

---

*Made with care for the ADHD Community.*
