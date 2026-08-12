<img src="docs/banner.svg" width="100%" alt="AAHAARAM — one scan, one meal, no double-dipping. QR meal distribution for events, with live counts and admin controls.">

<p align="center">
  <img alt="React" src="https://img.shields.io/badge/React-20232A?style=flat-square&logo=react&logoColor=61DAFB">
  <img alt="Vite" src="https://img.shields.io/badge/Vite-646CFF?style=flat-square&logo=vite&logoColor=white">
  <img alt="Express" src="https://img.shields.io/badge/Express-000000?style=flat-square&logo=express&logoColor=white">
  <img alt="MongoDB" src="https://img.shields.io/badge/MongoDB-47A248?style=flat-square&logo=mongodb&logoColor=white">
  <img alt="JWT" src="https://img.shields.io/badge/JWT-000000?style=flat-square&logo=jsonwebtokens&logoColor=white">
</p>

<p align="center">
  <a href="https://mealpass-portal.vercel.app"><img alt="Live demo" src="https://img.shields.io/badge/live_demo-mealpass--portal.vercel.app-0B7285?style=for-the-badge&logo=vercel&logoColor=white"></a>
</p>

## The problem

Feeding a few thousand people at a college fest usually means paper coupons. Coupons
get photocopied, passed to friends, counted by hand at midnight, and nobody knows how
much food is actually left until it runs out.

AAHAARAM replaces the coupon with a QR pass that **cannot be usefully screenshotted**,
and replaces the counting with a live dashboard.

## How a pass stays un-forgeable

A static QR code is just a picture — screenshot it, send it to ten friends, and ten
people eat. So the pass is not static.

Each participant is issued a TOTP secret at registration. The QR the volunteer scans
carries the participant's `qrId` plus a **rotating time-based code**, and the payload is
signed with an HMAC keyed on a server-side secret. Forging a pass requires the server
secret; reusing an old screenshot fails once the time window rolls over.

```mermaid
sequenceDiagram
    participant P as Participant app
    participant V as Volunteer scanner
    participant A as API
    participant DB as MongoDB

    P->>P: derive TOTP code from totpSecret
    P->>V: display QR (qrId + code + HMAC)
    V->>A: POST /api/scan  { payload, mealType }
    A->>A: verify HMAC with QR_SECRET
    A->>A: speakeasy.totp.verify(code)
    A->>DB: findOne(participantId, mealType, scanDate)
    alt already served today
        DB-->>A: existing scan
        A-->>V: 409 ALREADY SERVED
    else first claim
        A->>DB: insert Scan
        A-->>V: 200 serve the meal
    end
```

The duplicate check is a lookup on `(participantId, mealType, scanDate)` — so a person
gets one breakfast, one lunch and one dinner per day, and a second attempt is rejected
with the reason rather than a generic failure.

## Architecture

```mermaid
flowchart LR
    subgraph client["Client · React + Vite"]
        SC["Scanner<br/>html5-qrcode"]
        AD["Admin dashboard"]
        EX["Exports<br/>jsPDF · SheetJS"]
    end
    subgraph api["API · Express"]
        AU["authRoutes<br/>Google OAuth + JWT"]
        PR["participantRoutes"]
        SR["scanRoutes<br/>HMAC + TOTP verify"]
        AR["adminRoutes"]
    end
    DB[("MongoDB<br/>Participant · Scan<br/>User · Settings")]
    MAIL["Nodemailer<br/>pass delivery"]

    SC --> SR
    AD --> PR & AR
    EX --> AR
    AU & PR & SR & AR --> DB
    PR --> MAIL
```

## What it does

| Capability | Detail |
| :-- | :-- |
| Rotating QR passes | TOTP code per participant, HMAC-signed payload |
| One meal per slot | Unique claim per `participant × mealType × date` |
| Volunteer scanning | In-browser camera scanning, no native app to install |
| Google sign-in | `@react-oauth/google` for staff, JWT sessions thereafter |
| Approval workflow | `isApproved` / `isActive` flags gate who can be served |
| Categories | Participant, department and custom metadata per person |
| Exports | Attendance to PDF (jsPDF) and Excel (SheetJS) |
| Email delivery | Passes sent out via Nodemailer |

## Running it locally

You need Node 18+ and a MongoDB connection string.

**API**

```bash
cd server && npm install && npm run dev
```

`server/.env`:

| Variable | Purpose |
| :-- | :-- |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing key for session tokens |
| `QR_SECRET` | HMAC key for QR payloads — rotating this invalidates every issued pass |
| `EMAIL_USER` / `EMAIL_PASS` | Nodemailer credentials for sending passes |
| `CLIENT_URL` / `FRONTEND_URL` | Allowed origin for CORS and email links |
| `PORT` | Defaults to 5000 |

**Client**

```bash
cd client && npm install && npm run dev
```

`client/.env`:

| Variable | Purpose |
| :-- | :-- |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for staff sign-in |

> [!IMPORTANT]
> Camera access requires a secure context. `localhost` counts as secure, but if you test
> the scanner from a phone on your LAN you must serve it over HTTPS or the browser will
> refuse to open the camera.

## API surface

| Route | Purpose |
| :-- | :-- |
| `/api/auth` | Google OAuth exchange, JWT issue and refresh |
| `/api/participants` | Registration, approval, QR issue and lookup |
| `/api/scan` | Validate a pass and record the claim |
| `/api/admin` | Counts, attendance reports and export feeds |

## Screenshots

_Drop images into `docs/screenshots/` and reference them here — the scanner mid-scan and
the admin dashboard during service are the two worth showing._

## Licence

No licence file yet. Until one is added, default copyright applies and others cannot
legally reuse this code — add MIT if you want it to be usable.
