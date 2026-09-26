# TIS Tech Council

The website for the Tashkent International School Tech Council: hero, about,
projects (TISMUN featured), founders, a private suggestion box and a hidden
`/admin` page for reading suggestions.

**Stack:** React 18 · Vite · TypeScript · Tailwind · Motion (`motion/react`) ·
Lenis · Cloudflare Pages + Pages Functions + D1.

## Editing content

| What | Where |
| --- | --- |
| Founders (name, role, photo, tagline, bio) | `src/data/founders.ts` |
| Founder photos | `public/founders/yassir.jpg`, `dovud.jpg`, `damirbek.jpg` (portrait ~4:5, under 200 KB). Missing photos show an animated initials avatar. |
| Projects, TISMUN link, countdown dates | `src/data/projects.ts` (set `link` to the public TISMUN URL) |
| Suggestion categories | `src/data/categories.ts` (keep in sync with the `CHECK` in `schema.sql`) |
| Marquee ideas | `src/data/marquee.ts` |

## Running locally

```bash
cd techcouncil
npm install
npm run dev            # site only, http://localhost:5173
```

To run the suggestion box and `/admin` locally too:

```bash
cp .dev.vars.example .dev.vars          # sets ADMIN_PASSWORD=change-me locally
npm run db:migrate:local                # creates the tables in a local D1
npm run pages:dev                       # builds, then serves site + API on http://localhost:8788
```

## Deploying to Cloudflare Pages

All commands run from `techcouncil/`. Log in once with `npx wrangler login`.

1. **Create the D1 database**

   ```bash
   npx wrangler d1 create tis-tech-council
   ```

   Copy the printed `database_id` into `wrangler.toml` (replace the zeros).

2. **Run the migration** (creates `suggestions` and `rate_limits`)

   ```bash
   npm run db:migrate:remote
   ```

3. **Create the Pages project and deploy**

   ```bash
   npx wrangler pages project create tis-tech-council --production-branch main
   npm run deploy
   ```

   The D1 binding (`DB`) is read from `wrangler.toml`.

4. **Set the admin password** (and an IP-hash salt)

   ```bash
   npx wrangler pages secret put ADMIN_PASSWORD --project-name tis-tech-council
   npx wrangler pages secret put IP_SALT --project-name tis-tech-council
   ```

   Then redeploy (`npm run deploy`) so the secrets take effect.

5. Open `https://<your-project>.pages.dev/admin` and sign in with that password.

**Git-connected deploys instead:** in the Cloudflare dashboard, Workers & Pages →
Create → Pages → Connect to Git. Root directory `techcouncil`, build command
`npm run build`, output directory `dist`. Under Settings → Bindings add a D1
binding named `DB` pointing to `tis-tech-council`, and under Settings →
Variables and Secrets add `ADMIN_PASSWORD` and `IP_SALT` as secrets.

## How the suggestion box works

- `POST /api/suggestions` trims and validates on the server (10–1000 chars,
  known category, name ≤ 80, grade ≤ 20), rejects cross-site posts, and
  silently drops submissions that fill the hidden honeypot field.
- Rate limit: 5 suggestions per IP per hour. Only a salted SHA-256 hash of the
  IP is stored, in a separate `rate_limits` table pruned after 24 hours.
- Suggestions are never shown publicly. `/admin` posts the password to
  `POST /api/admin/suggestions`, which compares it against `ADMIN_PASSWORD` on
  the server (10 wrong attempts per IP per 15 minutes). The page lists
  suggestions newest first, filters by category, searches and exports CSV.

## Accessibility and motion

`prefers-reduced-motion` turns off the intro, Lenis, parallax, tilt and the
hero animation (it draws a single static frame). Tilt and cursor effects only
run on mouse/trackpad. The hero canvas loads lazily, pauses off-screen and
caps its pixel ratio.
