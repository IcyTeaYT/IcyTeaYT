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

## Deploying to Cloudflare Pages (auto-redeploys on every push)

Same setup as the TISMUN site: Cloudflare is connected to the GitHub repo and
rebuilds the site every time the production branch changes. Everything below
is done in the Cloudflare dashboard, once.

1. **Create the database.** Storage & Databases → **D1** → **Create database**,
   name it `tis-tech-council`. Copy its **Database ID**.
2. **Point the site at it.** Paste that ID into `techcouncil/wrangler.toml`
   (`database_id = "..."`) and commit. The ID is not a secret.
3. **Create the tables.** Open the database → **Console**, paste the contents
   of `techcouncil/schema.sql`, and run it.
4. **Connect the repo.** Workers & Pages → **Create** → **Pages** →
   **Connect to Git** → pick `IcyTeaYT/IcyTeaYT`. Build settings:

   | Setting | Value |
   | --- | --- |
   | Production branch | `master` |
   | Framework preset | None (or Vite) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | **Root directory** | `techcouncil` |

   The root directory matters: this project lives in a subfolder. The D1
   binding (`DB`) is read from `wrangler.toml`, so there is nothing to add for it.
5. **Add the secrets.** Pages project → **Settings** → **Variables and Secrets**
   → add two **Secrets**: `ADMIN_PASSWORD` (the `/admin` password) and
   `IP_SALT` (any long random string). Add a third, `TELEGRAM_BOT_TOKEN`
   (from @BotFather), to get every suggestion sent to the council's Telegram
   chat (`TELEGRAM_CHAT_ID` in `wrangler.toml`). Then **Deployments** →
   **Retry deployment** once so they take effect.

From then on every push to `master` rebuilds and redeploys automatically, and
every other branch gets its own preview URL. Your site lives at
`https://<project-name>.pages.dev`; add your own domain under **Custom domains**.

### Manual alternative (no auto-redeploy)

`npm run cf:setup` does the same setup from the terminal and uploads the site
directly (needs `npx wrangler login`, or `CLOUDFLARE_API_TOKEN` and
`CLOUDFLARE_ACCOUNT_ID`). A project created this way can't be connected to Git
later, so use one method or the other, and redeploy with `npm run deploy`.

## How the suggestion box works

- `POST /api/suggestions` trims and validates on the server (10–1000 chars,
  known category, name ≤ 80, grade ≤ 20), rejects cross-site posts, and
  silently drops submissions that fill the hidden honeypot field.
- Rate limit: 5 suggestions per IP per hour. Only a salted SHA-256 hash of the
  IP is stored, in a separate `rate_limits` table pruned after 24 hours.
- Each new suggestion is also sent by the council's Telegram bot to the chat
  in `TELEGRAM_CHAT_ID` (needs the `TELEGRAM_BOT_TOKEN` secret, and the chat
  must have pressed Start on the bot once). If Telegram is down the suggestion
  is still saved.
- Suggestions are never shown publicly. `/admin` posts the password to
  `POST /api/admin/suggestions`, which compares it against `ADMIN_PASSWORD` on
  the server (10 wrong attempts per IP per 15 minutes). The page lists
  suggestions newest first, filters by category, searches and exports CSV.

## Accessibility and motion

`prefers-reduced-motion` turns off the intro, Lenis, parallax, tilt and the
hero animation (it draws a single static frame). Tilt and cursor effects only
run on mouse/trackpad. The hero canvas loads lazily, pauses off-screen and
caps its pixel ratio.
