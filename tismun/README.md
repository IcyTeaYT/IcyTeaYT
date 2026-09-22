# TISMUN

The conference site for Tashkent International School Model United Nations.

Delegates sign in with their school account and see their committee, their
delegation and their background paper. Chairs get a full dashboard for running
their committee: Roll Call, timers, the General Speakers' List, caucuses,
Motions, Draft Resolutions, voting, a session log, and a projector display for
the room. The Secretariat gets a live view of every committee at once.

**October 15–16, 2026**, at Tashkent International School.

**Phase 1 (this build)** runs entirely on mock data, so the whole site works
today without a spreadsheet or a Google project. **Phase 2** swaps the mock data
for a live Google Sheet and real Google sign-in by changing one environment
variable — see [Switching to live mode](#switching-to-live-mode).

---

## Running it locally

```bash
cd tismun
npm install
npm run dev
```

Then open http://localhost:5173.

There is no login to set up: the **Demo access** panel on the sign-in page lets
you continue as a Delegate, a Chair or the Secretariat, or pick any of the 100
mock accounts, so you can see exactly what each person sees.

| Command | What it does |
| --- | --- |
| `npm run dev` | Development server with hot reload |
| `npm run build` | Typechecks the app and the API, then builds to `dist/` |
| `npm run preview` | Serves the built `dist/` locally |
| `npm run typecheck` | TypeScript only, no build |
| `npm run papers` | Regenerates the placeholder background paper PDFs |
| `npm run mock-data` | Regenerates the mock committees and accounts |

---

## Deploying to Cloudflare Pages

1. Push this repository to GitHub.
2. Cloudflare dashboard → **Workers & Pages** → **Create** → **Pages** →
   **Connect to Git**, and pick the repository.
3. Build settings:

   | Setting | Value |
   | --- | --- |
   | Framework preset | None (or Vite) |
   | Build command | `npm run build` |
   | Build output directory | `dist` |
   | **Root directory** | `tismun` |

   The root directory matters: this project lives in a subfolder.
4. Environment variables → add `VITE_DATA_MODE` = `demo` for now.
5. **Save and Deploy.**

`public/_redirects` sends every unmatched path to `index.html`, which is what
makes React Router's URLs work on a refresh or a shared link. Anything under
`/api/*` is claimed by the Pages Functions in `functions/` before that rule
applies.

To use your own domain: Pages project → **Custom domains** → **Set up a domain**.
If the domain is already on Cloudflare the DNS record is added for you;
otherwise Cloudflare shows you the exact CNAME to add at your registrar.

---

## Switching to live mode

Everything below is already written and waiting on configuration. Nothing in
`src/` needs to change.

### 1. Google sign-in (OAuth client ID)

1. [Google Cloud console](https://console.cloud.google.com) → create or pick a
   project → **APIs & Services** → **Credentials**.
2. **Create credentials** → **OAuth client ID** → **Web application**.
3. Authorised JavaScript origins:
   - `https://your-site.pages.dev` (and your custom domain, once it is live)
   - `http://localhost:5173` for development
4. Copy the client ID. It goes in **two** variables — `VITE_GOOGLE_CLIENT_ID`
   (public, used to draw the button) and `GOOGLE_CLIENT_ID` (server-side, used
   to check that a token was actually issued for us).

### 2. Service account for the Sheet

1. Same project → **APIs & Services** → **Library** → enable the
   **Google Sheets API**.
2. **IAM & Admin** → **Service Accounts** → create one.
3. Open it → **Keys** → **Add key** → **Create new key** → **JSON**. Download it.
4. From that JSON file, take `client_email` → `GOOGLE_SA_EMAIL`, and
   `private_key` → `GOOGLE_SA_PRIVATE_KEY` (paste it whole, including the
   `-----BEGIN PRIVATE KEY-----` lines).
5. Open the conference Sheet → **Share** → paste the service account address →
   give it **Viewer**. It never needs more: this site only reads.
6. The Sheet's ID is the long string in its URL, between `/d/` and `/edit`.
   That is `SHEET_ID`.

### 3. Environment variables

In the Cloudflare Pages project, **Settings → Environment variables**:

| Variable | Example | Secret? |
| --- | --- | --- |
| `VITE_DATA_MODE` | `live` | no |
| `VITE_GOOGLE_CLIENT_ID` | `1234-abc.apps.googleusercontent.com` | no |
| `VITE_SCHOOL_DOMAIN` | `tashkentis.uz` | no |
| `GOOGLE_CLIENT_ID` | same as above | no |
| `SCHOOL_DOMAIN` | `tashkentis.uz` | no |
| `SHEET_ID` | `1AbCdEf…` | no |
| `GOOGLE_SA_EMAIL` | `tismun@project.iam.gserviceaccount.com` | no |
| `GOOGLE_SA_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n…` | **yes — Encrypt** |
| `SESSION_SECRET` | 64+ random chars (`openssl rand -hex 32`) | **yes — Encrypt** |

Anything starting with `VITE_` is compiled into the JavaScript the browser
downloads, so it is public by definition. **Never** put the private key or the
session secret behind a `VITE_` name. For local testing of the API, put the
server-side values in `tismun/.dev.vars` (git-ignored) and run
`npx wrangler pages dev -- npm run dev`.

Redeploy after changing variables — Pages bakes `VITE_` values in at build time.

### 4. The Sheet's shape

Two tabs, with these headers in row 1:

**Users**

| Email | Full Name | Role | Committee ID | Country | Country Code | Title |
| --- | --- | --- | --- | --- | --- | --- |
| amir.nazarov@tashkentis.uz | Amir Nazarov | DELEGATE | unsc | China | CN | |
| aziza.karimova@tashkentis.uz | Aziza Karimova | CHAIR | unsc | | | |
| kamron.yusupov@tashkentis.uz | Kamron Yusupov | SECRETARIAT | | | | Secretary-General |

**Committees**

| Committee ID | Name | Abbreviation | Topic 1 | Topic 2 | Chairs | Room | Background Paper URL | Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| unsc | United Nations Security Council | UNSC | … | … | Aziza Karimova; Daniel Whitfield | Assembly Hall | /papers/unsc.pdf | … |

Notes:
- `Role` is `DELEGATE`, `CHAIR` or `SECRETARIAT`. Anything unrecognised is
  treated as `DELEGATE`, so a typo can never grant chair access by accident.
  `ADMIN` exists in the type and is ready to be given its own screens.
- `Title` is optional and only the Secretariat uses it — it is the post shown
  in the nav and on their dashboard.
- `Committee ID` is the key joining the two tabs, and also the PDF filename.
  Keep it short and lowercase.
- `Chairs` is one cell, names separated by semicolons.
- `Country` and `Country Code` are left blank for chairs.
- `Country Code` is the ISO 3166-1 two-letter code (`CN`, `GB`, `UZ`) — it
  draws the flag, so a wrong code shows a blank chip.
- Headers may carry a parenthetical note — `Country Code (ISO 2-letter)` is read
  as `Country Code` — so you can annotate the sheet for whoever fills it in.

`src/data/mock/users.json` and `committees.json` mirror these columns exactly,
so the mock data is a working example of the format.

### What live mode enforces

The API is already written to be strict, and the rules live on the server where
the browser cannot reach them:

- Identity comes from an **HttpOnly** signed cookie. Scripts cannot read it, and
  no request can claim to be someone else — there is no email parameter to change.
- The cookie stores only the email. Role and committee are re-read from the
  Sheet on every request, so changing someone's role in the spreadsheet takes
  effect immediately, and an old cookie can never assert a privilege its holder
  has lost.
- A valid school account is not enough — the address must also be on the roster.
- `/api/roster/:committeeId` is the only endpoint returning other people's
  records. It requires the caller's **sheet role** to be `CHAIR` *and* the
  committee asked for to be their own. A delegate calling it by hand gets a 403;
  so does a chair asking about another committee.
- The Sheet ID and the service-account key exist only on the server.

---

## Background papers

Papers live in `public/papers/` and are named `<committee-id>.pdf`, matching the
`Background Paper URL` column (`/papers/unsc.pdf`).

**To publish a real paper:** drop the PDF into `public/papers/`, named after the
committee ID, replacing the placeholder. Commit and push — Pages redeploys.

**To host papers elsewhere** (Google Drive, for instance), put the full URL in
the `Background Paper URL` column instead. The in-page viewer needs a direct
link to the file; Drive's share links open Drive's own preview, so use
`https://drive.google.com/uc?export=download&id=FILE_ID`.

**To regenerate the placeholders** after editing committees or topics:

```bash
npm run papers
```

---

## Rules of procedure

Everything the Secretariat might want to change is in **`src/config/rules.ts`**,
in one file, with no component changes needed:

- **`MOTIONS`** — the motion types, in the order they appear in the dropdown.
  Each has a `majority` (`'simple'` or `'two-thirds'`), a `disruptiveness` rank,
  and the `fields` the chair fills in when raising it. Adding a motion type
  here adds it to the form, the required-majority badge, the pass/fail maths and
  the ordering on the floor.
- **`disruptiveness`** — higher sits higher on the floor and is voted on first.
  Two caucuses of the same rank break the tie on the longer total time.
- **`QUORUM.fraction`** — one third by default. Set it to `0.5` for a
  simple-majority quorum.
- **`VOTING`** — the majority needed for resolutions and amendments, whether
  abstentions count toward the majority, and whether "Present and Voting"
  delegations forfeit the right to abstain.
- **`DEFAULTS`** — default speaking times and caucus lengths.

Conference name, venue, the Secretariat email address and all the page copy are
in **`src/config/conference.ts`**, and the dates in `CONFERENCE_DATES` in the
same file:

```ts
export const CONFERENCE_DATES = {
  start: '2026-10-15',
  end: '2026-10-16',
  timezone: 'Asia/Tashkent',
};
```

Those three values drive the date shown on the login page, home and footer, the
countdown on the delegate home ("23 days until TISMUN" → "Day 1" → "Thank you
for attending TISMUN 2026"), and the timestamps in the session log and its
exports. Everything is resolved in `timezone`, not in the viewer's local time:
a delegate opening the site from London at 22:00 on 14 October is looking at
03:00 on the 15th in Tashkent, and the site agrees with the room.

### A note on terminology

Every label in the interface is the official term — Moderated Caucus,
Unmoderated Caucus, General Speakers' List, Roll Call, Present and Voting,
Motion, Yield, Draft Resolution, Friendly and Unfriendly Amendment, Close
Debate, Voting Procedure, Quorum, Simple Majority, Two-Thirds Majority. Nothing
is renamed or simplified. Guided Mode makes it easy to *find* the right control,
not to avoid learning what it is called.

---

## How it is put together

```
tismun/
├── functions/api/          Cloudflare Pages Functions
│   ├── _lib/               Sheets client, session cookie, Google token checks
│   ├── session.ts          Sign in / sign out
│   ├── me.ts               Your own record
│   ├── committees.ts       Public committee info
│   ├── roster/[id].ts      Your committee's roster — chairs only
│   └── live/               Live session sync for the Secretariat (D1)
├── migrations/             D1 schema
├── public/
│   ├── logo.png            The TISMUN logo
│   ├── tis-logo.png        The host school's logo, always secondary
│   ├── papers/             Background papers, one per committee
│   └── _redirects          SPA fallback for Cloudflare Pages
├── scripts/                Placeholder-paper generator
└── src/
    ├── config/             Conference copy · rules of procedure
    ├── data/
    │   ├── mock/           Mock Sheet data, in the real column format
    │   └── source/         DataSource interface, mock and live implementations
    ├── lib/                Timer engine, majority maths, exports, broadcast
    ├── components/         Shared UI
    ├── pages/              Login · Home · Committees · Committee · Errors
    ├── features/chair/     Guided Mode and the chair tools
    ├── features/live/      Live sync: snapshots, clock skew, local fallback
    ├── features/secretariat/  The conference floor and per-committee views
    └── store/              Auth and committee state
```

Two pieces are worth knowing about:

**The data layer.** Every page reads through the `DataSource` interface in
`src/data/source/types.ts`. `mockSource` reads the JSON; `liveSource` calls the
API. Both hand their rows to the same normaliser, so the mock data is not a
stand-in — it is the live format, and the swap is one environment variable.

**The timers.** A timer stores three numbers: how long it runs, when the current
run started, and how much time it had banked before that. The remaining time is
derived from `Date.now()` every time it is read. Nothing counts down, so nothing
drifts — a caucus clock is still correct after the laptop sleeps, the tab is
backgrounded, or the chair refreshes mid-debate. It is also why the projector
stays in sync: the dashboard broadcasts the timer's *state*, not a number, so
the projector runs its own smooth countdown from a single message.

---

## Chair Dashboard

Open it from the nav when signed in as a chair. Session state is saved to the
browser, keyed by committee, so a refresh never loses the Roll Call, the
General Speakers' List, the timers or a vote in progress. **Reset session**
clears it.

### Guided Mode

The dashboard opens on **Guided Mode**: the whole session as a numbered list —
Take the Roll Call, Establish Quorum, Set the Agenda, Open the General
Speakers' List, Debate the Topic, Introduce Draft Resolutions, Voting
Procedure, Adjourn the Meeting — with the step the committee is actually on
opened up, showing the clock that matters and large buttons for what to do
next. Underneath sit the standing figures a chair is asked for constantly:
present, quorum, simple and two-thirds majorities.

Steps tick themselves off by reading the session, not by anyone marking them,
so the list cannot disagree with what happened: the Roll Call step completes
when the roll is taken, the Voting Procedure step when a Draft Resolution has
actually been decided.

Which stage is offered follows the rules of procedure: Voting Procedure
outranks a caucus, a caucus outranks Motions on the floor, and nothing opens
before quorum is met. The tools remain in the sidebar for everything Guided
Mode does not put one tap away.

### Voting

There is no separate voting screen. A Motion is voted on in **Motions**, where
it was raised. A Draft Resolution or an Unfriendly Amendment is voted on in
**Resolutions**, on the item itself — placard or roll call, with the tally and
the required majority in view. The chair never has to leave the thing being
voted on and re-select it somewhere else.

| Shortcut | Action |
| --- | --- |
| `Space` | Start / pause the timer that is currently in play |
| `R` | Reset that timer |
| `N` | Next speaker |
| `F` | Open the projector display |

**Projector mode** opens `/chair/display` in a second window — put it on the
room's projector and drive everything from the laptop. The two windows stay in
sync over `BroadcastChannel` (same browser, same machine).

---

## Secretariat

The `SECRETARIAT` role gets a **Conference floor** view: every
committee at once, with its current status, live timers, who has the floor,
attendance and quorum, Motions on the floor, Draft Resolutions, and a combined
session log across the whole conference. Clicking a committee opens a full
read-only view of it — the same information the chair sees, with no controls.

It refreshes every two seconds. Timers tick smoothly between refreshes because
what is sent is the timer's *state*, not a number of seconds, so the watching
browser runs its own countdown from a single message.

### Live sync across devices (Cloudflare D1)

Without a database the Secretariat view still works, but only for committees
running **in the same browser** — it reads what each chair's dashboard has
already saved to local storage. To watch chairs on their own laptops, bind a
D1 database:

```bash
# 1. Create the database
npx wrangler d1 create tismun

# 2. Create its tables
npx wrangler d1 execute tismun --remote --file=./migrations/0001_live_sync.sql
```

Then in the Cloudflare dashboard: **your Pages project → Settings → Functions →
D1 database bindings → Add binding**, with the variable name **`DB`** and the
`tismun` database. Redeploy.

The dashboard header tells you which mode you are in — *Live across devices* or
*This browser only* — so there is no guessing.

**How it works.** Each chair's browser posts a snapshot of its committee after
every change (debounced, and with a heartbeat so a silent committee is
distinguishable from a closed laptop). The server stores that JSON and hands it
back; it has no idea what a quorum is or which majority a Motion needs. Those
rules live in `src/config/rules.ts` and run in the browser, so there is no
second implementation on the server to drift out of step with the first.

Clock differences between devices are corrected: every response carries the
server's own time, and each browser translates timestamps into and out of that
shared reference, so a chair's laptop running three minutes fast does not make
every caucus look three minutes further along on the Secretariat's screen.

**In live mode** the endpoints are properly guarded — only a chair may report
their own committee, and only the Secretariat may read every committee.
**In demo mode there is no identity to check**, because the login page hands out
any account on request, so the live endpoints are open. A demo deployment is
public by design; do not put real delegate assignments on one.

---

## For Phase 2, I need from you

1. **The school's Google Workspace domain** — e.g. `tashkentis.uz`.
2. **The Google Sheet**, laid out as above, shared with the service account as
   Viewer, plus its ID.
3. **The OAuth client ID**, with the deployed origins registered.
4. **The service account's `client_email` and `private_key`.** Send these
   privately — never in a commit, a screenshot or a chat message that others can
   read. If one leaks, delete the key in the Cloud console and make a new one.
5. **The conference details** — real dates, venue, Secretariat email address,
   and the edition name, for `src/config/conference.ts`.
6. **Your rules of procedure**, if they differ from the defaults: which motions
   need two-thirds, your order of disruptiveness, your quorum, and whether
   abstentions count toward a majority.
7. **The real background papers**, as PDFs named by committee ID.
8. **The real committees and assignments** — this build ships six committees and
   100 invented accounts purely as an example.
9. **Who holds the Secretariat account**, and their post. That row takes the
   optional `Title` column in the Users tab (e.g. "Secretary-General"); every
   other row leaves it blank. Add more `SECRETARIAT` rows if more than one
   person needs the conference-floor view.
