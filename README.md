# VisitFlow - Visitor Pass Management System

VisitFlow is a MERN application for registering visitors, issuing secure digital passes, and recording check-in/check-out activity. It implements the assignment's core roles: Admin, Security/Frontdesk, and Employee/Host.

## Included

- JWT authentication and role-protected API routes
- MongoDB models for users, visitors, appointments, passes, and check logs
- QR pass generation and scan endpoint which toggles check-in/check-out
- React dashboard with live API integration, client-side search/filtering, JWT persistence, role-based views, and a responsive visitor-registration flow
- Public visitor registration/portal with a `visitor` role
- Multipart visitor photo upload stored as a data URL for the demo
- Browser camera QR scanning with the native BarcodeDetector API
- Seed data for a working demo

## Run locally

1. Install Node.js 20+ and MongoDB, then start MongoDB locally.
2. Copy `server/.env.example` to `server/.env` and set a strong `JWT_SECRET`.
3. From the project root, install packages:

   ```bash
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

4. Seed the database and start both applications:

   ```bash
   npm run seed
   npm run dev
   ```

Open `http://localhost:5173`. The API runs on `http://localhost:5000`.

Demo administrator: `admin@visitflow.test` / `Pass@123`.

## API overview

| Method | Endpoint | Purpose |
| --- | --- | --- |
| POST | `/api/auth/login` | Sign in and receive JWT |
| GET/POST | `/api/visitors` | Search or register visitors |
| POST | `/api/appointments` | Create a pre-registration |
| GET/POST | `/api/passes` | List or issue QR passes |
| POST | `/api/passes/:code/scan` | Check visitor in/out |
| GET | `/api/dashboard` | Dashboard totals and activity |

## Next production integrations

The app includes a local notification outbox for email/SMS events. To deliver real messages, wire the `notify` adapter in `server/src/index.js` to SMTP/SendGrid and Twilio using your own credentials. Camera-based scanning is implemented in React with the browser BarcodeDetector API and connected to `/api/passes/:code/scan`. If a browser lacks BarcodeDetector support, the manual pass-code field remains available.

## Submission material

See [docs/SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) for requirement coverage and final steps, and [docs/DEMO_SCRIPT.md](docs/DEMO_SCRIPT.md) for a short demo-video script.
