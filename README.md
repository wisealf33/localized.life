# SaleTrail by Localized.Life

Launch 1 garage sale directory and simple route builder.

## Launch 1 boundaries

- No user accounts.
- No scraping.
- No automated posting, commenting, messaging, or importing.
- Community-added listings are clearly labeled as unclaimed until manually approved.
- Claim, correction, and removal requests use manual admin review.
- Shoppers save route stops locally in the browser.
- Route export opens selected addresses in Google Maps.
- No paid embedded map, payments, ads, tokens, ICP, Pactum, reviews, messaging, live GPS, or route optimization.
- Private seller manage links are stored as hashes in the database.
- Admin tools use `SALETRAIL_ADMIN_PASSWORD` to create a short httpOnly admin session; the password is not embedded in page HTML.

## Local setup

1. Install dependencies:

```bash
npm install
```

2. Create `.env.local` from `.env.example`:

```bash
NEXT_PUBLIC_SITE_URL=http://localhost:3000
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SALETRAIL_ADMIN_PASSWORD=choose-a-private-password
```

3. In Supabase, open the SQL editor and run `supabase/schema.sql`.

4. Start the app:

```bash
npm run dev
```

5. Open `http://localhost:3000/saletrail`.

## Deployment notes

1. Push this project to GitHub.
2. Create a Vercel project from the GitHub repository.
3. Add the same environment variables in Vercel.
4. Create a Supabase project and run `supabase/schema.sql`.
5. Set `NEXT_PUBLIC_SITE_URL` in Vercel to the public domain, for example `https://localized.life`.
6. Configure the domain in Vercel so the public path is `https://localized.life/saletrail`.

Admin review is at `/saletrail/admin`. Enter the admin password to view pending claims, corrections, and removals.
