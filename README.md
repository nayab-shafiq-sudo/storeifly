# Storeifly: Multi-Store E-Commerce Platform

Storeifly is a multi-vendor e-commerce platform where merchants launch their own storefronts, manage products and orders, and use AI-powered image tools, while customers shop from individual stores and admins oversee the whole platform.

## Features

### Customer
- Create an account on an individual shop
- Log in and browse a store's catalog
- Place orders (Cash on Delivery)
- View order history, receipts, and live order status

### Merchant
- Create a merchant account and set up a store (name, slug, logo, banner, currency, shipping rules)
- Edit store details and branding
- Create and delete product categories
- Add and manage products (images, variants, stock, pricing)
- View store analytics (revenue, orders, average order value, low stock)
- Manage orders: update fulfillment status, payment status, and tracking code
- **AI image tools (Cloudinary):**
  - Product colour variants (generative recolor)
  - Background removal
  - On-model photo / virtual try-on
- Customize storefront hero layout (4 styles) and store accent colour

### Admin
- Log in with an admin account
- View platform analytics
- View all stores and their merchant details
- Suspend / activate store accounts

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React, TypeScript, Vite, Tailwind CSS, React Router, Axios, react-hot-toast, lucide-react |
| Backend | Node.js, Express, TypeScript, Prisma, Multer |
| Database | Neon Postgres |
| Auth | Neon Auth |
| Public API | Neon Functions (`publicapi`) for public store and product reads |
| Media / AI | Cloudinary (uploads, generative recolor, background removal, image-to-image generation) |

## Architecture

```
React (Vite, :5173)
   |-- Authenticated + write requests  -->  Express API (:3000)  -->  Prisma  -->  Neon Postgres
   |-- Public reads (store, products)  -->  Neon Function "publicapi"  -->  Neon Postgres
                                            Express  -->  Cloudinary (uploads + AI transforms)
```

## Project Structure

```
storeifly/
├── client/                    # React frontend
│   └── src/
│       ├── pages/             # merchant, admin, storefront, customer pages
│       ├── components/        # layouts, forms, storefront sections
│       ├── context/           # AuthContext, CartContext
│       └── config/api.ts      # Axios instance
└── server/                    # Express backend
    ├── controller/            # store, category, product, order, upload, analytics
    ├── routes/
    ├── middleware/            # requireAuth, optionalAuth, requireRole
    ├── services/              # neonUsers (Neon Auth user helpers)
    ├── config/                # prisma, cloudinary
    ├── functions/index.ts     # Neon Function (public API)
    └── neon.ts                # Neon Functions config
```

## Getting Started

### Prerequisites
- Node.js 18+
- A [Neon](https://neon.com) project (Postgres + Auth + Functions)
- A [Cloudinary](https://cloudinary.com) account (with generative AI add-ons enabled for recolor, background removal, and on-model features)
- Neon CLI: `npm i -g neon`

### 1. Clone and install

```bash
git clone <your-repo-url>
cd storeifly

cd server && npm install
cd ../client && npm install
```

### 2. Environment variables

**`server/.env`**

```env
DATABASE_URL=postgresql://user:password@host/dbname?sslmode=verify-full
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
PORT=3000
```

Neon variables (`DATABASE_URL`, `NEON_AUTH_BASE_URL`, `NEON_AUTH_JWKS_URL`, ...) can be pulled with `neon deploy` / `neon env`.

**`client/.env`**

```env
VITE_API_URL=http://localhost:3000
VITE_PUBLIC_API_URL=https://<your-neon-function-url>/api
```

### 3. Database

```bash
cd server
npx prisma generate
npx prisma db push
```

### 4. Run locally

```bash
# Backend
cd server
npm run dev

# Neon public API function (local, port 8787)
neon dev

# Frontend
cd client
npm run dev
```

Open http://localhost:5173.

### 5. Deploy the public API function

```bash
cd server
neon deploy
```

## Creating the Admin Account

Admin accounts are not created from the app. Sign up normally with a dedicated email, then promote it in the Neon SQL editor:

```sql
UPDATE neon_auth.user SET role = 'admin' WHERE email = 'your-admin-email@example.com';
```

Log out and log in again so the new role is picked up.

> **Never commit real credentials to this repository.** Use a strong password for the admin account and keep it out of version control.

## Main Routes

### Frontend

| Route | Description |
|---|---|
| `/store/:storeSlug` | Public storefront |
| `/store/:storeSlug/orders` | Customer order history |
| `/store/:storeSlug/order-confirmation/:orderNumber` | Order receipt |
| `/merchant/login` | Merchant login |
| `/merchant/store-setup` | Create a store |
| `/merchant` | Merchant dashboard |
| `/merchant/products` | Products |
| `/merchant/categories` | Categories |
| `/merchant/orders` | Orders and fulfillment |
| `/merchant/settings` | Store settings |
| `/admin` | Admin dashboard |

### Express API (`localhost:3000`)

| Method | Endpoint | Description |
|---|---|---|
| POST | `/api/stores` | Create store |
| GET / PUT | `/api/stores/me` | Get / update my store |
| GET / POST / DELETE | `/api/categories` | Categories |
| POST | `/api/orders/checkout` | Place order |
| GET | `/api/orders/receipt/:orderIdentifier` | Order receipt |
| GET | `/api/orders/customer/my-orders` | Customer order history |
| GET / PATCH | `/api/orders/merchant`, `/api/orders/merchant/:id/status` | Merchant orders |
| POST | `/api/upload/single`, `/api/upload/multiple` | Image upload |
| POST | `/api/upload/ai-transform` | Recolor / background removal |
| POST | `/api/upload/ai-on-model` | On-model photo generation |
| GET | `/api/analytics/merchant` | Merchant analytics |
| GET / PUT | `/api/stores/admin/...` | Admin: stores, merchants, suspend |

### Neon public API

| Method | Endpoint | Description |
|---|---|---|
| GET | `/api/health` | Health check |
| GET | `/api/stores/featured` | Featured stores |
| GET | `/api/stores/slug/:slug` | Store by slug |
| GET | `/api/products?storeId=` or `?storeSlug=` | Product list (supports `status`, `categoryId`, `search`) |
| GET | `/api/products/:id` | Single product |

## Notes

- Payments are **Cash on Delivery**. Payment status is set to `paid` by the merchant (or on delivery).
- Suspended stores are blocked from the public API and checkout.
- Prices come back from Postgres as strings (for example `"32.00"`), so convert with `Number(...)` before doing calculations.

## License

MIT
