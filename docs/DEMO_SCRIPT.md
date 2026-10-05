# 90-second demo video script

1. Start on **Overview** and point out total visitors, expected visitors, active occupancy, and recent access activity.
2. Open **Visitors**, search for a visitor, and use **New visitor** to register a guest.
3. Open **Appointments**. Explain that a visitor can pre-register and the host approves the appointment before a pass is issued.
4. Open **Passes**. Issue a QR-based visitor pass and explain that the API can download a PDF badge at `/api/passes/:code/badge.pdf`.
5. Open **Scan pass**, enter `VP-DEMO2026`, and process it to demonstrate check-in/check-out logging.
6. Finish by explaining that administrators and security staff can export attendance data from `/api/reports/check-logs.csv`.

Use the seeded administrator account in the README: `admin@visitflow.test` / `Pass@123`.
