# Visitor Pass MERN Assignment - Submission Checklist

## Requirement coverage

| PDF requirement | Implementation |
| --- | --- |
| Admin, Security, Employee/Host roles | JWT payloads and role middleware in `server/src/auth.js` |
| Visitor registration and photo field | Visitor model and registration form/API |
| Appointment / pre-registration | Public pre-registration and host approval endpoints |
| QR digital pass | Unique pass code and QR data URL created by API |
| PDF badge | `GET /api/passes/:code/badge.pdf` generates a badge |
| Check-in / check-out | Scan endpoint creates immutable check-log entries |
| Email/SMS notifications | Notification outbox; connect SMTP/Twilio credentials for live delivery |
| Dashboard / reports / export | Dashboard metrics, search UI, CSV check-log export |

## Before you submit

1. Run `npm run seed` once on a local demo database.
2. Run `npm run dev` and open `http://localhost:5173`.
3. Capture screenshots of Overview, Visitors, Appointments, Passes, and Scan pass.
4. Record the 90-second flow in `docs/DEMO_SCRIPT.md`.
5. Push this folder to a new GitHub repository and submit its URL.

Do not commit `server/.env`; use `server/.env.example` for submission.
