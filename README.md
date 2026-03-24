# Bet Mates

A small Next.js betting app starter for a private friend group.

## Stack

- Next.js App Router
- Clerk authentication for Google sign-in or email/password accounts
- Neon Postgres for the database

## What is built

- A shared overview page for accepted bets
- Challenge creation by email
- Pending incoming and outgoing challenges
- Acceptance flow where a bet is only added to the overview after the challenged user accepts
- Stakes displayed in Swedish kronor (SEK)

## Setup

1. Install dependencies:

   ```bash
   npm install
   ```

2. Start the app:

   ```bash
   npm run dev
   ```

3. Clerk can run in keyless mode, so you can launch the app without adding Clerk environment variables first.

4. If you want to connect Neon right away, copy the example file and add `DATABASE_URL`:

   ```bash
   cp .env.example .env.local
   ```

   Then paste your Neon connection string into `.env.local`:

   ```bash
   DATABASE_URL="postgresql://USER:PASSWORD@HOST.neon.tech/DATABASE?sslmode=require"
   ```

5. If you prefer to initialize Neon manually, run the SQL in [db/init.sql](/Users/johndahlberg/Desktop/Code%20projects/Betting-app/db/init.sql) in the Neon SQL editor. The app can also create the same tables automatically on first successful connection.

6. After the app starts, use the sign-up button in the top navigation as your first test user.
   - If Clerk shows a "Configure your application" callout, click it.
   - When the profile icon appears in the nav, the auth setup is working.

## Database notes

The app creates the first version of the schema automatically on first load. For production, the next step should be moving that schema into formal SQL migrations.
