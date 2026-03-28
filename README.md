# Shop Management Hub

PostgreSQL-backed shop management platform built with **TypeScript** and **Next.js**, designed to deploy easily on **Vercel**.

## Phase 2 Features

- **Staff authentication**
  - Email/password sign-in for staff users
  - Role-based access control to `/staff`
- **Customer authentication**
  - Email/password sign-in
  - Google social sign-in (customer accounts only)
  - Role-based access control to `/customer`
- **Customer management**
  - Staff can create/manage customer records
- **Service templates**
  - Staff can save reusable services with default rates and durations
- **Scheduling**
  - Staff can schedule appointments
  - Customers can self-schedule appointments from their portal
- **Invoicing**
  - Staff can create invoices from customers + services
  - Tax/subtotal/total calculation and status updates (`DRAFT`, `SENT`, `PAID`)
  - Customer self-booking auto-generates draft invoices
- **PostgreSQL persistence**
  - All business data is stored in Postgres via Prisma ORM

## Tech Stack

- Next.js (App Router)
- TypeScript
- NextAuth.js
- Prisma ORM
- PostgreSQL
- ESLint

## Environment Variables

Create a `.env` file:

```bash
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/DBNAME?schema=public"
NEXTAUTH_SECRET="replace-with-a-long-random-secret"
GOOGLE_CLIENT_ID="optional-for-customer-google-login"
GOOGLE_CLIENT_SECRET="optional-for-customer-google-login"
```

If Google credentials are omitted, credential login still works for both roles.

## Local Development

```bash
npm install
npm run prisma:generate
npm run prisma:migrate
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repository into Vercel.
3. Set environment variables (`DATABASE_URL`, `NEXTAUTH_SECRET`, optional Google keys).
4. Run Prisma migration in your deployment workflow or against your hosted database before first use.
5. Deploy.

No custom server is required.
