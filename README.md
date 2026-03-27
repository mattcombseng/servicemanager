# Shop Management Hub

Web-based shop management solution built with **TypeScript** and **Next.js**, designed to be easy to host on **Vercel**.

## Features

- **Customer management**
  - Save customer profiles with contact info and notes
- **Service templates**
  - Define reusable services with default rates and durations
- **Scheduling**
  - Create and track customer appointments
- **Invoicing**
  - Generate invoices from customer + service selections
  - Apply quantity and tax rate
  - Track status (`draft`, `sent`, `paid`)
- **Local persistence**
  - Data is saved to browser localStorage for quick MVP usage

## Tech Stack

- Next.js (App Router)
- TypeScript
- React
- ESLint

## Getting Started

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## Build

```bash
npm run build
```

## Deploy to Vercel

1. Push this repository to GitHub.
2. Import the repo into Vercel.
3. Keep default settings (Next.js detected automatically).
4. Deploy.

No custom server is required.
