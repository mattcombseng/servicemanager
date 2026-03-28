# Shop Management Hub

PostgreSQL-backed shop management platform built with **TypeScript** and **Next.js**, designed to deploy easily on **Vercel**.

## Current Features

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
- **Password reset**
  - Forgot-password token generation
  - Password reset with one-time token usage
- **Email verification**
  - New accounts must verify email before credential login
  - Verification tokens are one-time and expire
- **Staff invite-only onboarding**
  - Staff registration requires a valid invite token created by existing staff
  - Staff invite management screen at `/staff/invites`
- **Calendar-style scheduling**
  - Staff dashboard includes a 14-day grouped calendar-style appointment view
- **Payment links and processing (simulated)**
  - Staff can generate payment links for invoices
  - Simulated payment webhook and payment-link endpoint mark invoices paid
- **Automated notifications/reminders**
  - Queue and process appointment reminder + invoice due notifications
  - Payment received notifications are created when payments succeed
- **Reporting & analytics dashboard**
  - Revenue trend (30 days), top services, outstanding totals, and scheduling risk indicators

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

### First-time setup for database schema

After setting `DATABASE_URL`, apply committed migrations:

```bash
npx prisma migrate dev
```

This repo now includes committed migrations for:

- `20260301090000_phase2_core_auth` (core shop + auth models)
- `20260301100000_phase3_payments_notifications_analytics` (payments/reminders/analytics additions)
- `20260327130000_phase3_payments_notifications_analytics` (legacy compatibility alias for older local migration histories)

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

## Security/flow notes

- Credential login requires verified email.
- Google login remains customer-only.
- Password reset and email verification tokens are currently returned in API responses for development/demo purposes. In production, these should be delivered through an email provider.
- Payment links and webhook flow are currently simulated for development. Replace with Stripe checkout + signed webhooks in production.
