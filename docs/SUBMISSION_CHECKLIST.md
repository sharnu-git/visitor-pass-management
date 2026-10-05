# Visitor Pass MERN Assignment - Submission Checklist

## Mentor feedback coverage

| Mentor requirement | Implementation |
| --- | --- |
| Client-to-backend API integration | `client/src/main.jsx` uses authenticated `fetch()` calls to Express for dashboard, visitors, appointments, passes, PDF and CSV |
| Client authentication | Login calls `/api/auth/login`; JWT + user/role are persisted in `localStorage`; logout clears the session |
| Role-based views | Admin/security/employee dashboard and a separate visitor portal are rendered from the authenticated role |
| Visitor role + public portal | User schema includes `visitor`; `/api/public/visitor-register` creates visitor accounts; `/api/my-visits` powers the visitor portal |
| Visitor photo upload | React file input sends `FormData`; Express/Multer parses multipart uploads and stores the demo image as a data URL |
| Client-side filtering | Visitors page supports live text search plus Expected / Checked in / Checked out filters |
| Camera QR scanner | Scan Pass page uses `getUserMedia()` + native `BarcodeDetector` and sends the decoded code to the existing scan endpoint |
| Screenshots | Capture the pages listed below after running the completed application |

## Existing functionality retained

- Admin, Security, Employee/Host roles
- JWT authentication and role-protected API routes
- MongoDB models for users, visitors, appointments, passes, and check logs
- QR pass generation and check-in/check-out
- PDF visitor badges
- CSV check-log export
- Dashboard metrics and recent activity
- Appointment approval workflow

## Screenshot checklist

Capture these for submission:

1. Staff login screen
2. Overview dashboard showing live MongoDB/API data
3. Visitors page with search/filtering
4. New visitor form showing photo upload
5. Appointments page with approval controls
6. Digital passes page with PDF/CSV actions
7. Camera QR scanner page
8. Public visitor registration page
9. Visitor portal after visitor login

## Run before submission

```bash
npm install
npm install --prefix server
npm install --prefix client

npm run seed
npm run dev
```

Staff demo:
`admin@visitflow.test` / `Pass@123`

For a visitor demo, open `http://localhost:5173/?visitor=1`, create a visitor account, then use the returned authenticated visitor portal.

Do not commit `server/.env`; use `server/.env.example` for submission.
