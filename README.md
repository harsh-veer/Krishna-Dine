# Krishna Dine

QR-based ordering, kitchen display and billing for **Krishna Hotel and Restaurant, Akbarpur, Uttar Pradesh**.

Customers scan the QR code on their table, browse the menu, and place an order from their phone (no app). The order is saved in MongoDB and appears on the kitchen display instantly, with a sound. Every status change the kitchen makes shows up live on the customer's phone. Admins manage the menu, tables and QR codes, staff, billing (optional service charge, printable invoices) and reports.

This is a standalone application with its own frontend, backend and database. It is not connected to the hotel website. Because the API is a plain REST + Socket.IO service, the website can link to it or embed it later.

| Module | Who | Where |
| --- | --- | --- |
| Customer ordering | Guests, on their phone | `/menu/<table-token>` (opened from the QR code) |
| Kitchen display (KDS) | Kitchen staff and admins | `/kitchen` |
| Admin dashboard and billing | Admins | `/admin` |

---

## Contents

1. [Tech stack](#tech-stack)
2. [Project structure](#project-structure)
3. [Local development](#local-development)
4. [Initial logins (local development only)](#initial-logins-local-development-only)
5. [How it works](#how-it-works)
6. [API reference](#api-reference)
7. [Socket.IO events](#socketio-events)
8. [Security](#security)
9. [Billing and payments](#billing-and-payments)
10. [QR code configuration](#qr-code-configuration)
11. [Deployment (Atlas, Render, Vercel)](#deployment)
12. [Admin account setup for production](#admin-account-setup-for-production)
13. [Testing](#testing)
14. [Assumptions and defaults](#assumptions-and-defaults)

---

## Tech stack

- **Client:** React 18, Vite, Tailwind CSS, React Router, Axios, Lucide icons, React Hook Form + Zod, Recharts, react-hot-toast, socket.io-client
- **Server:** Node.js 18+, Express, MongoDB with Mongoose, Socket.IO, JWT, bcrypt, Zod, Helmet, CORS, express-rate-limit, express-mongo-sanitize, qrcode, multer

## Project structure

```
krishna-dine/
├── client/                      React + Vite app (customer, kitchen, admin)
│   ├── src/
│   │   ├── components/          UI kit (Button, Modal, Tabs…), Logo, FoodImage, charts, dialogs
│   │   ├── context/             AuthContext (staff session), CartContext (per-table cart)
│   │   ├── hooks/               useStaffOrders (live orders), useChime (new-order sound), useNow…
│   │   ├── layouts/             AdminLayout, KitchenLayout
│   │   ├── pages/               customer/, kitchen/, admin/, auth/
│   │   ├── services/            api.js (Axios), endpoints.js, socket.js, config.js
│   │   ├── utils/               formatting, QR card renderer
│   │   └── assets/
│   ├── vercel.json              SPA rewrites + security headers
│   └── .env.example
├── server/                      Express API + Socket.IO
│   ├── config/                  env validation, DB connection, constants
│   ├── controllers/             route handlers
│   ├── middleware/              auth (JWT + RBAC), validation, rate limits, errors, uploads
│   ├── models/                  User, Table, Category, MenuItem, Order, Payment, Settings, Counter, Upload
│   ├── routes/                  all REST routes in one readable file
│   ├── services/                orders, pricing, billing, payment gateway, QR, reports
│   ├── sockets/                 Socket.IO auth, rooms, event emitter
│   ├── validators/              Zod schemas for every request
│   ├── utils/                   dates (IST), money (paise), CSV, ZIP, tokens
│   ├── seed/                    sample data, seed script, create-admin script
│   ├── tests/                   integration tests (real MongoDB + live sockets)
│   └── .env.example
├── e2e/acceptance.cjs           browser test of the full 16-step workflow
├── render.yaml                  Render blueprint for the API
└── README.md
```

## Local development

**Requirements:** Node.js 18.18 or newer (22 recommended), and MongoDB 6+ running locally (or a free MongoDB Atlas cluster).

```bash
# 1. Install
cd krishna-dine
npm --prefix server install
npm --prefix client install

# 2. Configure the API
cp server/.env.example server/.env      # defaults work for local MongoDB
cp client/.env.example client/.env      # optional; defaults work

# 3. Seed sample data (9 categories, 25 veg dishes, 10 tables, admin + kitchen users)
npm --prefix server run seed

# 4. Run (two terminals)
npm --prefix server run dev             # API + sockets on http://localhost:5000
npm --prefix client run dev             # app on http://localhost:5173
```

In development the Vite dev server proxies `/api` and `/socket.io` to the API, so no URLs are hard-coded in application code.

**Test on a real phone on the same Wi-Fi:** find your computer's LAN IP (for example `192.168.1.20`), set `PUBLIC_MENU_URL=http://192.168.1.20:5173` and add it to `CORS_ORIGINS` in `server/.env`, restart the API, then open a table's QR code from **Admin → Tables & QR** and scan it. (Vite already listens on all interfaces.)

Useful scripts:

| Command (in `server/`) | What it does |
| --- | --- |
| `npm run seed` | Creates anything missing from the sample data. Safe to re-run. |
| `npm run seed:reset` | Deletes all Krishna Dine data and reseeds. Refuses to run in production. |
| `node seed/seed.js --reset --no-tables` | Reseed without the 10 sample tables (to create Table 01 yourself). |
| `npm run create-admin -- --email you@x.com --name "You" --password "..."` | Creates or resets an admin. |
| `npm test` | Integration tests against MongoDB (uses database `krishna_dine_test`). |

## Initial logins (local development only)

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@krishnadine.local` | `Admin@12345` |
| Kitchen staff | `kitchen@krishnadine.local` | `Kitchen@12345` |

Both accounts are created with **"must change password"** set. The server blocks every API call except "change password" until a new password is chosen, so these defaults cannot be used past the first login. **Do not seed these accounts in production.** See [Admin account setup for production](#admin-account-setup-for-production).

## How it works

### Customer flow
1. Each table has a QR code that opens `https://<your-domain>/menu/<token>`. The token is 144 bits of random data, not a table number, so it cannot be guessed.
2. The app validates the token (`GET /api/public/tables/:token`), shows a welcome screen with the table number, then the menu by category with search, veg markers, availability and prep times.
3. The cart lives on the phone, scoped to that table. At checkout the customer adds cooking instructions, their name and an optional mobile number.
4. `POST /api/orders` sends only the QR token, item ids and quantities. The **server** looks up the table, checks every item is still available, and calculates prices and totals from the database. Any price the client sends is ignored.
5. The order is saved first, then broadcast to the kitchen. The customer gets the order number and a secret **tracking token**, which lets only that phone follow the order live.

### Kitchen display
- Tabs: **New orders** (pending), **Preparing** (accepted + preparing), **Ready**, **Completed** (served and cancelled, last 12 hours).
- Each card shows order number, a large table number, time placed, a live elapsed timer (amber after 15 min, red after 25), items and quantities, and special instructions in a highlighted box.
- Buttons: Accept → Start preparing → Mark ready → Mark served, plus Cancel with a required reason (quick reasons provided).
- New orders play a chime, flash the browser tab title and pulse until accepted. Browsers only allow sound after one tap, so the screen shows **"Tap to enable sound"** until then.
- **Item availability** lets the kitchen mark dishes sold out. Customer menus update immediately.
- The connection badge shows **Live** or **Reconnecting**. After any reconnect the board reloads from the API, so nothing is missed while offline.

### Admin dashboard
- **Dashboard:** orders today, revenue today, pending, completed, collected amount, best sellers (7 days), daily sales (7 days) and weekly sales (8 weeks), latest orders. Updates live.
- **Orders & billing:** filter by date, table, status, payment status and search; open an order to see items, timeline, status actions, the bill and payments. **Deleting history:** tick finished orders (closed or cancelled) and use *Delete selected*, delete one from its detail page, or use *Clean up old orders* to remove everything finished that is older than 7 to 365 days. Deletion is permanent, asks for confirmation, removes the order's payments too, and never touches open orders. Deleted orders drop out of reports, so export the monthly CSV first if you need the figures.
- **Menu:** add, edit and delete items (soft delete), upload photos, set price, category, description, veg flag, prep time and availability; manage categories (order, visibility).
- **Tables & QR:** add and edit tables, see status and open orders, view, download (PNG card with table number) and print QR codes individually or in bulk (print sheet or ZIP of PNGs), regenerate a code (old printouts stop working), disable or enable a table.
- **Reports:** daily, weekly and monthly sales, orders, collected, hourly or daily chart, popular items, payment methods; **Export CSV**.
- **Staff:** add admins or kitchen staff, change role, activate or deactivate, reset passwords. Changing role or deactivating someone signs them out everywhere.
- **Settings:** restaurant name, address, phone, service charge, rounding, invoice footer, UPI ID, payment gateway status.

### Order statuses
`pending → accepted → preparing → ready → served`, or `cancelled` (with reason) from any state before served. Transitions are enforced on the server with atomic conditional updates, so two kitchen screens tapping the same button cannot double-apply a change or send duplicate events. An order is **closed** by an admin after it is served and paid, which frees the table.

## API reference

All responses use `{ "success": true, "data": ... }` or `{ "success": false, "error": { "message", "code", "details" } }` with proper HTTP status codes (400 validation, 401 unauthenticated, 403 forbidden, 404, 409 conflict, 410 disabled table, 413, 429 rate limited, 500).

Auth: send `Authorization: Bearer <token>` (the login response also sets an httpOnly cookie).

| Method & path | Access | Purpose |
| --- | --- | --- |
| `POST /api/auth/login` | public (rate limited) | Staff login |
| `POST /api/auth/logout` | public | Clears the auth cookie |
| `GET /api/auth/me` | staff | Current user |
| `POST /api/auth/change-password` | staff | Change own password (revokes other sessions) |
| `GET /api/public/tables/:token` | public | Resolve a QR token to its table |
| `GET /api/public/settings` | public | Name, address, service charge for the customer app |
| `GET /api/menu` | public (`?all=true` for staff) | Categories and items |
| `GET /api/categories` | public (`?all=true` for staff) | Categories |
| `POST /api/menu` · `PUT /api/menu/:id` · `DELETE /api/menu/:id` | admin | Manage items |
| `PATCH /api/menu/:id/availability` | admin, kitchen | Sold out / available |
| `POST /api/categories` · `PUT /api/categories/:id` · `DELETE /api/categories/:id` | admin | Manage categories |
| `POST /api/uploads` · `GET /api/uploads/:id` | admin · public | Upload / serve food images |
| `GET /api/tables` | admin, kitchen | Tables with open-order counts |
| `POST /api/tables` · `PUT /api/tables/:id` · `DELETE /api/tables/:id` | admin | Manage tables |
| `GET /api/tables/:id/qr` | admin | QR as data URL (`?format=png&download=true` for a PNG file) |
| `POST /api/tables/:id/regenerate-qr` | admin | New token; old QR stops working |
| `GET /api/tables/qr/bulk` · `GET /api/tables/qr/bulk.zip` | admin | Bulk QR (JSON for printing, or ZIP of PNGs); `?ids=a,b` |
| `POST /api/orders` | public (rate limited) | Place order: `{ qrToken, customerName, customerPhone?, specialInstructions?, idempotencyKey?, items: [{ menuItemId, quantity }] }` |
| `GET /api/orders` | admin, kitchen | List: `date`, `from`, `to`, `table`, `status` (comma list), `paymentStatus`, `active`, `search`, `page`, `limit` |
| `GET /api/orders/:id` | staff, or customer with `X-Order-Token` | One order |
| `PATCH /api/orders/:id/status` | admin, kitchen | `{ status, reason? }` (reason required to cancel) |
| `GET /api/orders/table/:tableId` | admin, kitchen | Orders for a table (`?includeClosed=true`) |
| `GET /api/orders/:id/bill` · `POST /api/orders/:id/bill` | admin | View / generate bill (`{ applyServiceCharge? }`) |
| `POST /api/orders/:id/payments` | admin | `{ paymentMethod: cash|upi|card, transactionReference? }` |
| `PATCH /api/payments/:id/confirm` · `PATCH /api/payments/:id/fail` | admin | Only used with a payment gateway |
| `POST /api/payments/:id/verify` | admin | Gateway signature verification (when a gateway is configured) |
| `POST /api/orders/:id/close` | admin | Close a served, paid order |
| `DELETE /api/orders/:id` · `POST /api/orders/bulk-delete` (`{ ids }`, max 200) | admin | Permanently delete closed or cancelled orders and their payments. Open orders are refused |
| `POST /api/orders/purge-old` (`{ olderThanDays, dryRun? }`) | admin | Delete all closed or cancelled orders older than N days (`dryRun` only counts) |
| `GET /api/reports/dashboard` | admin | Dashboard numbers |
| `GET /api/reports/daily?date=YYYY-MM-DD` | admin | Daily report (`&format=csv`) |
| `GET /api/reports/weekly?end=YYYY-MM-DD` | admin | 7 days ending on `end` (`&format=csv`) |
| `GET /api/reports/monthly?month=YYYY-MM` | admin | Monthly report (`&format=csv`) |
| `GET/POST /api/users` · `PUT/DELETE /api/users/:id` · `POST /api/users/:id/reset-password` | admin | Staff management |
| `GET/PUT /api/settings` | admin | Billing and restaurant settings |
| `GET /api/health` | public | Health check |

## Socket.IO events

Connect to the API origin with `io(API_URL, { auth: { token } })`. Staff pass their JWT; customers connect without one.

| Event | Sent to | When |
| --- | --- | --- |
| `new-order` | staff room, order room | Order saved |
| `order-accepted` / `order-preparing` / `order-ready` / `order-served` / `order-cancelled` | staff room, order room | Status changed |
| `order-updated` | staff room, order room | Bill generated, payment recorded, order closed |
| `table-updated` / `table-deleted` | staff room | Table changes |
| `menu-updated` | everyone | Menu or availability changed |

- Invalid staff tokens are refused at the handshake. Guests never join the staff room.
- A customer joins an order's room by emitting `track-order` with `{ orderId, token }`. The server verifies the HMAC tracking token before joining (max 20 orders per socket).
- Every payload has a unique `eventId` and the order `version`; clients drop duplicates and stale updates.
- Customer payloads never include phone numbers or staff names.

## Security

| Requirement | Implementation |
| --- | --- |
| Password hashing | bcrypt, 12 rounds |
| JWT auth | Signed with `JWT_SECRET`, issuer and audience checked, 12h expiry, `tokenVersion` lets password changes, role changes and deactivation revoke old tokens |
| Role-based access | `authorize('admin')` / `authorize('admin','kitchen')` on every route. Kitchen staff get 403 on reports, tables, menu edits, billing, staff and settings (covered by tests) |
| Forced password change | Seeded and admin-created accounts must change password before any other API call |
| Input validation | Zod schema for every body, query and param; unknown fields are stripped |
| NoSQL injection | express-mongo-sanitize strips `$` and `.` keys; Zod forces primitive types |
| Server-side pricing | Totals come from DB prices; client prices ignored; item snapshot stored on the order |
| QR tokens | 144-bit random tokens, unique index, regenerate to revoke, disabled tables return 410 |
| Order ownership | HMAC tracking token required to read or follow an order as a customer |
| Duplicate orders | Client idempotency key with a unique index; races resolved by returning the winner |
| Duplicate events | Atomic conditional status updates; event ids + versions for client de-duplication |
| Rate limiting | API 300/min/IP, login 10 failures/15 min, orders 30/5 min/IP, public lookups 120/min |
| CORS | Allow-list from `CORS_ORIGINS` (HTTP and Socket.IO) |
| Helmet | Security headers; strict CSP for API responses; cross-origin resource policy set for images |
| Uploads | Image MIME allow-list, magic-byte check, 2 MB limit, stored in MongoDB |
| Errors | Central handler; no stack traces or internals sent to clients |
| Secrets | Only in server env vars. Production refuses to start with a weak `JWT_SECRET` or localhost URLs |
| CSV export | Formula-injection characters escaped |

## Billing and payments

- **No GST is charged.** Totals are the item prices plus an optional service charge. Old orders that had GST still display it.
- **Service charge** is optional: set a rate in Settings and either enable it by default or apply it per bill.
- The total can be rounded to the nearest rupee (shown as "Round off").
- **Generate bill** assigns a sequential invoice number per Indian financial year (`INV/2026-27/00001`). Until it is paid, the bill can be regenerated with current settings. Item names and prices always come from the order snapshot.
- **Print invoice** opens a narrow tax-invoice layout that suits A4 or 80 mm thermal printers.
- **Payments:** Cash and Card are recorded as paid when staff confirm receipt (marked "Confirmed by staff").
- **Payments:** cash and UPI only. Staff check the money arrived, press Mark paid, and then close the order. No UTR is needed. (If a payment gateway is configured, UPI waits for the gateway instead.)
- **Payment gateway interface:** `server/services/paymentGateway.js` defines `createIntent()` and `verify()`. A Razorpay implementation is included (order creation and signature verification). To turn it on, set `PAYMENT_GATEWAY=razorpay`, `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`. It has **not** been tested against live Razorpay because no credentials were available. You would still need a checkout UI (Razorpay Checkout or a UPI intent QR) that calls `POST /api/payments/:id/verify`. Other providers (PhonePe, Paytm, Cashfree) can be added by implementing the same two functions.
- **Close order** is allowed once the order is served and paid (or cancelled). Closing frees the table.

## QR code configuration

- QR codes encode `PUBLIC_MENU_URL + /menu/ + token`. Set `PUBLIC_MENU_URL` to the public address of the client app (for example `https://dine.krishnahotel.in`).
- The URL is derived when requested, so if you change domains, re-download and reprint the QR codes. The tokens stay the same.
- **Download PNG** produces a branded card (restaurant name, QR, "Table 01", instructions). **Print** opens a print sheet; use "Save as PDF" for a file. **Download all (ZIP)** gives plain QR PNGs for a print shop.
- **Regenerate** if a code is copied or misused. The printed code stops working immediately.
- **Disable** a table to stop orders without deleting it (for example during renovation).

## Deployment

The frontend is a static Vite build (Vercel). The API needs a long-running Node process for WebSockets (Render web service, Railway, Fly.io, a VPS, or similar).

### 1. Database: MongoDB Atlas
1. Create a free M0 cluster (region close to India, for example Mumbai `ap-south-1`).
2. **Database Access:** add a user with read/write on `krishna_dine`.
3. **Network Access:** allow Render's outbound IPs, or `0.0.0.0/0` while testing.
4. Copy the connection string, add the database name: `mongodb+srv://USER:PASS@cluster0.xxxxx.mongodb.net/krishna_dine?retryWrites=true&w=majority`.

### 2. API: Render
1. Push this repo to GitHub.
2. In Render choose **New → Blueprint** and select the repo; `render.yaml` creates the `krishna-dine-api` web service (root `server/`). Or create a Web Service manually: root directory `server`, build `npm ci --omit=dev`, start `npm start`, health check `/api/health`.
3. Set the environment variables:
   - `MONGODB_URI`: Atlas string from above
   - `JWT_SECRET`: auto-generated by the blueprint (or `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`)
   - `CORS_ORIGINS`: your Vercel URL(s), comma separated, for example `https://krishna-dine.vercel.app,https://dine.krishnahotel.in`
   - `PUBLIC_MENU_URL`: the URL customers should open, for example `https://dine.krishnahotel.in`
   - `NODE_ENV=production`, `TRUST_PROXY=1`
4. Note: Render's free plan sleeps after inactivity, which disconnects the kitchen display and makes the first scan slow. Use at least the Starter plan for service hours.

### 3. Frontend: Vercel
1. **New Project → import the repo**, set **Root Directory** to `client` (framework: Vite; `vercel.json` handles SPA routing and headers).
2. Environment variable: `VITE_API_URL=https://krishna-dine-api.onrender.com` (your Render URL, no trailing slash). `VITE_SOCKET_URL` is only needed if sockets live on a different host.
3. Deploy, then add the Vercel domain to `CORS_ORIGINS` and `PUBLIC_MENU_URL` on Render if you have not already.

### 4. First production run
1. Create your real admin (below). Do **not** run the sample seed in production unless you want the sample menu; if you do, change both seeded passwords immediately (the app forces this).
2. Log in, set restaurant details in **Settings**, build the real menu, create tables, and print the QR codes.

## Admin account setup for production

From your machine (with `MONGODB_URI` pointing at Atlas) or the Render shell:

```bash
cd server
MONGODB_URI="mongodb+srv://..." node seed/createAdmin.js --email owner@krishnahotel.in --name "Owner" --password "a-long-unique-password"
```

Then create kitchen accounts from **Admin → Staff**. New staff must set their own password on first login. If you seeded sample data in production, deactivate or delete `admin@krishnadine.local` and `kitchen@krishnadine.local`.

Optional sample data in production (menu only, still forces password change):
```bash
NODE_ENV=production MONGODB_URI="..." SEED_ADMIN_PASSWORD="..." SEED_KITCHEN_PASSWORD="..." node seed/seed.js
```

## Testing

**API integration tests** (real MongoDB, live HTTP and Socket.IO server):
```bash
cd server && npm test        # uses MONGODB_URI_TEST or mongodb://127.0.0.1:27017/krishna_dine_test
```
They cover login and forced password change, kitchen-vs-admin authorization, NoSQL injection payloads, the full order lifecycle with socket events, price tampering, idempotent double submission, order-ownership checks, invalid transitions, billing math, cash and UPI recorded by staff (no card), close-order rules, reports and CSV, disabled and regenerated QR codes, sold-out items, cancellation reasons, menu-price snapshots, and socket room isolation.

**Browser acceptance test** (the brief's 16-step workflow, using desktop, tablet and iPhone viewports):
```bash
# terminal 1: cd server && node seed/seed.js --reset --no-tables && npm run dev
# terminal 2: cd client && npm run dev
cd e2e && npm install && npx playwright install chromium && npm test
```
It logs in as admin, creates Table 01, downloads its QR PNG and **decodes** it, opens that URL on a phone viewport, orders three dishes with quantities and instructions, verifies the kitchen receives it live with sound, walks it through Accepted → Preparing → Ready (checking the customer screen updates without reload) → Served, then has the admin generate the bill, record payment, close the order and print the invoice. Screenshots go to `e2e/screenshots/`.

## Assumptions and defaults

- **Categories:** the brief lists nine customer categories (Starters, Soups, Chinese, South Indian, Main Course, Indian Breads, Rice and Biryani, Beverages, Desserts) but asks for eight in the seed. All nine are seeded so every listed category exists.
- **Vegetarian:** all 25 sample dishes are vegetarian. Non-veg items are supported (a brown triangle marker) if you add them.
- **Food images:** no photos are bundled. Each dish shows an illustrated, category-coloured placeholder that can never be a broken link. Upload real photos in **Admin → Menu**; they are stored in MongoDB so they survive redeploys.
- **Prices:** sample prices are typical for a mid-range restaurant in eastern UP; edit them in the admin.
- **GST 5%, prices exclusive of GST,** no service charge by default. Change in Settings.
- **Timezone:** reports, order numbers (`KD261031-001`) and day boundaries use IST (UTC+5:30).
- **Billing is admin-only.** Kitchen staff handle order status and item availability. Add a "cashier" role later if front-desk staff should bill without full admin access.
- **Customers pay at the counter.** The app shows the estimated total; the final bill is generated by staff.
- **Staff sessions** keep the JWT in localStorage, so a kitchen tablet stays signed in across reloads. Tokens expire after 12 hours and can be revoked.
- **Integration with the hotel website later:** link to `/menu/<token>` or embed pages; the API is independent and CORS-controlled.

## Owner-only staff management

Only the account whose email matches `OWNER_EMAIL` (default `veerharsh919@gmail.com`) can open the Staff page or add, disable, change the role of, reset the password of, or delete staff. Other admins get a 403 and do not see the Staff menu item. Set the `OWNER_EMAIL` environment variable on the server to change the owner.

## Waiter role

Create a staff account with the **Waiter** role (owner only, on the Staff page). Waiters sign in to `/waiter`: they can create orders for a table, edit open orders, accept/advance/cancel orders and see the live order list. They cannot see bills, payments, reports, the dashboard, settings or staff, and the API refuses those routes with 403. The order list and order screens show items and status only, no prices or totals.
