# BookConnect — Online Bookstore with Delivery (XAMPP + Node.js)

| Part | Technology |
|------|-----------|
| Web server | **XAMPP Apache** (serves the React site and forwards `/api` to Node) |
| Database | **XAMPP MySQL** (manage it in phpMyAdmin) |
| Backend | **Node.js + Express** (JavaScript only, no Python) |
| Frontend | React + Vite |

Three roles: **Customer**, **Delivery Agent**, **Admin**. Everyone logs in on the same page and **chooses their role**.

## 1. One-time setup
1. Install **XAMPP** and **Node.js LTS**.
2. Open the XAMPP Control Panel and **Start Apache and MySQL**.

## 2. Start the backend
```
cd backend
npm install
npm start
```
On first start it creates the `bookconnect` database, all tables and demo data automatically
(check it in phpMyAdmin: http://localhost/phpmyadmin). You should see:
`✓ BookConnect API running on http://localhost:3000`.
Keep this window open. If you changed the MySQL password in XAMPP, put it in `backend/.env` (`DB_PASSWORD=`).

## 3. Open the website — pick ONE option

**Option A: development (easiest)**
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

**Option B: served by XAMPP Apache** (`http://localhost/bookconnect/`)
1. In `xampp/apache/conf/httpd.conf` make sure these lines do NOT start with `#` (remove it if they do), then restart Apache:
   ```
   LoadModule rewrite_module modules/mod_rewrite.so
   LoadModule proxy_module modules/mod_proxy.so
   LoadModule proxy_http_module modules/mod_proxy_http.so
   ```
2. Build and copy the site:
   ```
   cd frontend
   npm install
   npm run build:xampp
   ```
   Copy **everything inside `frontend/dist`** (including the hidden `.htaccess` file) into `C:\xampp\htdocs\bookconnect\`.
3. Open http://localhost/bookconnect/ (the Node backend from step 2 must be running).

## Demo logins
| Role (choose on the login page) | Email | Password |
|------|-------|----------|
| Customer | customer@bookconnect.com (or phone 0725333939) | Customer@123 |
| Delivery Agent | agent@bookconnect.com | Agent@123 |
| Admin | admin@bookconnect.com | Admin@123 |

The role you choose must match the account, otherwise login is refused. Public sign-up only creates **customers**.
After login: customer → `/dashboard`, admin → `/admin/dashboard`, agent → `/agent/dashboard`.

## Notifications
The bell icon (top right) shows unread notifications and a pop-up appears within ~10 seconds.
| Event | Who is notified |
|------|-----------------|
| Admin adds a new book | **every customer** ("New book added") — click it to open the book |
| Order status changes / agent assigned | the customer |
| Order assigned to an agent | the agent |
| New order placed / order delivered | all admins |

Test it: log in as admin in one browser and as customer in another (or a private window), then add a book in **Admin → Books → Add Book**.

## Database (MySQL)
Tables: `users`, `books`, `reviews`, `wishlist`, `addresses`, `orders`, `order_items`, `payments`, `tracking_events`, `notifications`.
The SQL is in `database/schema.sql` (the backend runs it automatically; you can also import it in phpMyAdmin).
To reset to fresh demo data: `cd backend && npm run seed`.

## M-Pesa
`MPESA_MODE=simulate` (default in `backend/.env`) completes payments instantly for demos. For real payments set `MPESA_MODE=live`, add Daraja keys, and expose `/api/payments/mpesa/callback` publicly (e.g. ngrok). The live code is not tested against Safaricom.

## Troubleshooting
| Problem | Fix |
|---------|-----|
| `Could not connect to MySQL` when running `npm start` | Start MySQL in the XAMPP Control Panel; check port 3306 and `DB_PASSWORD` in `backend/.env` |
| Page says "Cannot reach the server" | Node backend is not running (`npm start` in `backend`) |
| `/bookconnect/` works but refreshing another page gives 404 | `.htaccess` was not copied, or `rewrite_module` is disabled |
| Errors on `/bookconnect/api/...` (500/503) | `proxy_module` / `proxy_http_module` disabled, or Node is not running |
| Port 3000 in use | Change `PORT` in `backend/.env` and the proxy target in `frontend/vite.config.js` / `frontend/public/.htaccess` |

## Tests
`cd backend && npm test` runs an integration test against a separate `bookconnect_test` database.

## Known limits
- Tested here on MySQL 9.7 (not XAMPP's MariaDB) and the Apache proxy rules were not run on a real Apache. The SQL is plain MySQL/MariaDB-compatible, but check Option B on your machine.
- Card payments are a demo. Notifications are in-app (polling), not email/SMS or instant push.
- No password-reset flow yet.
