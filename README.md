# Shop Companion 3.0

**A multi-store retail intelligence platform** for managing inventory, cashiers, and customer checkout — built as a single-page web app with a Supabase backend.

Live site: [dashup.store](https://dashup.store)

---

## Overview

Shop Companion 3.0 supports three simultaneous retail stores with fully isolated inventory, per-store cashier accounts, a shared customer loyalty system, and real-time data sync via Supabase. A developer panel sits above the client layer, enabling platform-wide monitoring of retailers and subscriptions.

### Stores

| Store | ID | Plan |
|---|---|---|
| JDC Grocery | `grocery` | Basic |
| Toylandia | `toy` | Pro |
| Hiraya Likhain | `school` | Premium |

---

## Architecture

```
index.html          — Single-page shell, screen router, store selector
├── styles.css      — Global design tokens & shared UI primitives
├── admin.css       — Sidebar, panels, dashboard, scale, badges
├── auth.css        — Login screens & auth UI
├── customer.css    — Customer-facing storefront styles
│
├── supabase.js     — Supabase client + all DB helpers (field mappers, CRUD)
├── shared.js       — Data layer: localStorage cache + Supabase sync, seed data
├── auth.js         — Authentication (developer PIN, client login, cashier login, customer auth)
├── admin.js        — Developer panel, client panel, cashier panel logic
└── customer.js     — Customer storefront: browse, cart, shopping lists, rewards, QR
```

Data flows **localStorage (fast cache) → Supabase (persistent store)**. All writes go to both; reads prefer Supabase where freshness matters.

---

## User Roles

| Role | Access | Credentials (demo) |
|---|---|---|
| **Developer** | Platform-wide: all retailers, subscriptions, customer accounts, raw DB | PIN `363738` |
| **Client / Retailer** | Their own store: inventory, cashiers, orders, reports | e.g. `jdcgrocery@astech.pro` / `jdcgrocery` |
| **Cashier** | Checkout, barcode scanner, weight verification, order receipts | e.g. `mariasantos@jdcgrocery.cashier.pro` / `maria333` |
| **Customer** | Browse products, cart, shopping lists, QR loyalty card, rewards | Self-registered |

---

## Features

**Developer Panel**
- Retailer management (add / edit / delete)
- Subscription plans (Basic ₱499, Pro ₱999, Premium ₱1,999 / 30 days)
- Platform-wide customer accounts and cashier accounts
- Revenue overview per retailer

**Client (Retailer) Panel**
- Inventory CRUD with barcode, category, unit, expiry date, and weight
- Low-stock alerts and expiry warnings
- Cashier management (add / suspend / reset password)
- Orders history and reports
- Customer QR code generation

**Cashier Panel**
- Barcode scanner checkout (ZXing)
- QR code scan for customer loyalty lookup
- Weight verification with simulated scale integration
- Discount / voucher application
- Tax calculation
- Printable receipts

**Customer Panel**
- Multi-store product browsing with category filters
- Cart with voucher codes
- Shopping lists (saved & named)
- Loyalty points and rewards
- QR loyalty card (QRCode.js)
- Terms gate on first visit

---

## Database Schema (Supabase)

Run the following once in the **Supabase SQL Editor**:

```sql
create table retailers (
  id text primary key, client_name text, store_name text,
  email text unique, phone text, location text, plan text,
  access_code text, subscription_start date, subscription_end date,
  status text default 'active', monthly_revenue jsonb default '[]'
);

create table inventory (
  id text primary key, store_id text not null, name text,
  barcode text, category text, type text, price numeric,
  stock integer default 0, unit text, image text, expiry date,
  low_stock_at integer default 10, weight_grams numeric
);

create table cashiers (
  id text primary key, store_id text, store_slug text,
  store_name text, client_email text, name text, username text,
  login_email text unique, password text,
  role text default 'cashier', status text default 'active',
  added date default now()
);

create table customers (
  id text primary key, name text, email text unique,
  password text, phone text, joined date default now(),
  last_login timestamptz, total_orders integer default 0,
  points integer default 0
);

create table orders (
  id text primary key, store_id text, cashier_email text,
  cashier_name text, customer_id text, customer_name text,
  items jsonb, subtotal numeric, discount numeric default 0,
  tax numeric default 0, total numeric,
  status text default 'completed', weight_check jsonb,
  created_at timestamptz default now()
);

-- Disable RLS (app handles auth)
alter table retailers  disable row level security;
alter table inventory  disable row level security;
alter table cashiers   disable row level security;
alter table customers  disable row level security;
alter table orders     disable row level security;
```

---

## Setup

### 1. Add Supabase scripts to `index.html`

In the `<head>`, **before** your other scripts and after the CSS links:

```html
<!-- Supabase -->
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase.js"></script>
```

Final script load order:

```html
<script src="https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2"></script>
<script src="supabase.js"></script>
<script src="shared.js"></script>
<script src="auth.js"></script>
<script src="admin.js"></script>
<script src="customer.js"></script>
```

### 2. Run the SQL schema

Paste and execute the SQL above in **Supabase → SQL Editor → New query**.

### 3. Seed initial data

After deploying the site:

1. Open the site in your browser
2. Open DevTools → Console (`F12`)
3. Run: `seedSupabase()`
4. Wait ~10 seconds
5. Verify rows appear in the **Supabase Table Editor**

---

## What Syncs to Supabase

| Action | Table |
|---|---|
| Add / edit / delete product | `inventory` |
| Stock deducted at checkout | `inventory.stock` |
| Order completed | `orders` |
| Add / edit retailer | `retailers` |
| Customer points updated | `customers` |
| Add / edit cashier | `cashiers` |

---

## External Dependencies

| Library | Purpose |
|---|---|
| [Supabase JS v2](https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2) | Database client |
| [QRCode.js](https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js) | Customer loyalty QR generation |
| [ZXing](https://unpkg.com/@zxing/library@0.19.1/umd/index.min.js) | Barcode / QR scanner at checkout |

All loaded via CDN — no build step required.

---

## File Reference

| File | Purpose |
|---|---|
| `index.html` | App shell, screen routing, store selector UI |
| `styles.css` | Global CSS custom properties, typography, shared components |
| `admin.css` | Sidebar, nav, panels, scale/weight, badge variants |
| `auth.css` | Login and authentication screen styles |
| `customer.css` | Customer storefront styles |
| `supabase.js` | Supabase client init, all DB CRUD helpers, camelCase ↔ snake_case mappers, `seedSupabase()` |
| `shared.js` | `Store` (localStorage wrapper), `seedData()`, weight migration, shared utilities |
| `auth.js` | `AUTH_CONFIG`, `STORE_DEFINITIONS`, login/logout for all four role types |
| `admin.js` | Developer / client / cashier panel rendering and event logic |
| `customer.js` | Customer browse, cart, shopping lists, rewards, terms gate |
| `CNAME` | Custom domain — `dashup.store` |
| `robots.txt` | Allows all crawlers, points to sitemap |
| `sitemaps.xml` | XML sitemap for search indexing |

---

## Demo Accounts

**Clients**

| Email | Password | Store |
|---|---|---|
| `jdcgrocery@astech.pro` | `jdcgrocery` | JDC Grocery |
| `toylandia@astech.pro` | `toylandia` | Toylandia |
| `hirayal@astech.premium` | `hirayal` | Hiraya Likhain |

**Cashiers**

| Email | Password | Store |
|---|---|---|
| `mariasantos@jdcgrocery.cashier.pro` | `maria333` | JDC Grocery |
| `markreyes@toylandia.cashier.pro` | `markreyes` | Toylandia |
| `junecruz@hirayal.cashier.premium` | `junecruz123` | Hiraya Likhain |

**Customers** (pre-seeded)

| Email | Password |
|---|---|
| `mark@gmail.com` | `mark123` |
| `ana@gmail.com` | `ana123` |

**Developer PIN:** `363738`

---

## Notes

- Passwords are stored as plaintext in this demo build. For production, hash passwords server-side before writing to Supabase.
- Row Level Security (RLS) is disabled for simplicity. For production, enable RLS and issue scoped JWTs per role.
- The Supabase anon key in `supabase.js` is a publishable key — safe to expose client-side, but ensure RLS policies are in place before going to production with real data.
