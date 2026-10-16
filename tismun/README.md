# TISMUN

The conference site for Tashkent International School Model United Nations.

Delegates sign in with their school account and see their committee, their
delegation and their background paper. Chairs get a full dashboard for running
their committee: Roll Call, timers, the General Speakers' List, caucuses,
Motions, Draft Resolutions, voting, awards, a session log, and a projector
display for the room. The Secretariat gets a live view of every committee at
once.

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
you continue as a Delegate, a Chair or the Secretariat, or pick any of the 128
accounts, so you can see exactly what each person sees.

The eight committees, their chairs and their rooms are the real ones for
TISMUN 2026. The delegations within them are still placeholders until the
Google Sheet is connected.

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
| `GOOGLE_CLIENT_ID` | same as above | no |
| `SHEET_ID` | `1AbCdEf…` | no |
| `GOOGLE_SA_EMAIL` | `tismun@project.iam.gserviceaccount.com` | no |
| `GOOGLE_SA_PRIVATE_KEY` | `-----BEGIN PRIVATE KEY-----\n…` | **yes — Encrypt** |
| `SESSION_SECRET` | 64+ random chars (`openssl rand -hex 32`) | **yes — Encrypt** |

**Who gets in is decided by the `Users` sheet.** Anyone signing in with Google
whose email is on it is let in; anyone else is told they are not on the roster.
It works with any Google account, so put down the address each person will
actually sign in with.

Two optional extras, if every participant has a school Workspace account:

| Variable | Example | What it does |
| --- | --- | --- |
| `SCHOOL_DOMAIN` | `tashkentis.uz` | Refuses any account not on that domain, even before the sheet is checked |
| `VITE_SCHOOL_DOMAIN` | `tashkentis.uz` | Names the domain in the login hint |

Without them the login page still tells everyone to use their school Google
account.

One more optional variable gives the site's owner extra access (see
[Owner and sign-in log](#owner-and-sign-in-log)):

| Variable | Example | What it does |
| --- | --- | --- |
| `OWNER_EMAILS` | `you@school.org` | Comma-separated. These accounts also get the Secretariat view and the sign-in log |

### If sign-in fails

The login page shows what went wrong in plain English — every setup mistake is
caught and explained rather than failing with a Cloudflare error page:

| Message mentions | Fix |
| --- | --- |
| Sheets API is not enabled | Google Cloud → APIs & Services → Library → Google Sheets API → Enable |
| not shared with the service account | Share the sheet with the `GOOGLE_SA_EMAIL` address as Viewer |
| No Google Sheet found | `SHEET_ID` is wrong — copy the part between `/d/` and `/edit` |
| uploaded Excel file | In Google Sheets, File → Save as Google Sheets, and use that file's ID |
| no tab called … | The tabs must be named exactly `Users` and `Committees` |
| Google rejected the service account key | `GOOGLE_SA_EMAIL` and the key come from different JSON files, or the key was deleted |
| private key could not be read | Paste the whole `private_key` value, BEGIN and END lines included |
| not on the conference roster | That exact email is not in the `Users` tab |

Anything starting with `VITE_` is compiled into the JavaScript the browser
downloads, so it is public by definition. **Never** put the private key or the
session secret behind a `VITE_` name. For local testing of the API, put the
server-side values in `tismun/.dev.vars` (git-ignored) and run
`npx wrangler pages dev -- npm run dev`.

Redeploy after changing variables — Pages bakes `VITE_` values in at build time.

### 4. The Sheet's shape

Two tabs, with these headers in row 1:

**Users**

| Email | Full Name | Role | Committee ID | Country | Emergency Role | Emergency Country |
| --- | --- | --- | --- | --- | --- | --- |
| amir.nazarov@tashkentis.uz | Amir Nazarov | DELEGATE | ga-2 | China | DELEGATE | India |
| yassir@tashkentis.uz | Yassir | CHAIR | ga-2 | | DELEGATE | India |
| kamron.yusupov@tashkentis.uz | Kamron Yusupov | SECRETARIAT | | | CHAIR | |

**Committees**

| Committee ID | Name | Abbreviation | Topic 1 | Topic 2 | Chairs | Room | Background Paper URL | Description |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| ga-2 | General Assembly 2 | GA 2 | … | … | Yassir; Damirbek; Jihoo | Room 510 | /papers/ga-2.pdf | … |

Notes:
- `Role` is `DELEGATE`, `CHAIR` or `SECRETARIAT`. Anything unrecognised is
  treated as `DELEGATE`, so a typo can never grant chair access by accident.
  `ADMIN` exists in the type and is ready to be given its own screens.
- `Committee ID` is the key joining the two tabs, and also the PDF filename.
  Keep it short and lowercase. This year's are `hrc-russian`, `hrc-1`,
  `hrc-2`, `sc`, `hsc-1`, `hsc-2`, `ga-2` and `ga-3`.
- `Chairs` does not need filling in: each committee's chairs are read from the
  Users tab (Role `CHAIR` with that Committee ID; for the Emergency Session,
  Emergency Role `CHAIR`), in the order they appear there, so the names shown
  always match who can chair. The cell is only used for a committee with nobody
  marked as its chair (names separated by semicolons).
- `Country` is left blank for chairs and the Secretariat.
- **Just type the country's name** — the flag is worked out from it. Formal UN
  names work too: "Russian Federation", "Viet Nam", "Republic of Korea",
  "Türkiye", "Côte d'Ivoire". A name it does not recognise still appears in
  roll call, just with a blank flag. For that rare case you can add a
  `Country Code` column and type the two-letter code on that row.
- `Emergency Role` and `Emergency Country` are Day 2. `DELEGATE` plus a
  country puts someone in that country's Emergency Session team (a country with
  the role left blank counts as `DELEGATE`); `CHAIR` makes them an Emergency
  Session chair. `CHAIR` plus a country does both: they run the committee at
  the Chair Dashboard and write that country's draft on the Resolution page,
  with a switcher in the nav. Both blank: not in the Emergency Session. `Role`, `Committee
  ID` and `Country` stay the Day 1 assignment — see
  [Roles by day](#roles-by-day).
- Headers may carry a note in brackets — `Country (as on the placard)` is read
  as `Country` — so you can annotate the sheet for whoever fills it in.

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
  records. It requires the caller to chair that committee **today** (or, from
  Day 2, to have chaired it on Day 1). A delegate calling it by hand gets a 403;
  so does a chair asking about another committee.
- Who may run which committee is worked out on every request from the Sheet and
  the server's clock — see [Roles by day](#roles-by-day).
- The Sheet ID and the service-account key exist only on the server.

---

## Background papers

Papers live in `public/papers/` and are named `<committee-id>.pdf`, matching the
`Background Paper URL` column (`/papers/unsc.pdf`).

**One paper per topic:** put the PDFs in `public/papers/` as
`<committee-id>-topic-1.pdf` / `-topic-2.pdf` and list them in
`src/config/papers.ts`. That committee then shows a Topic 1 and a Topic 2 paper
(a switch on its page, a row each on the cards); committees not listed there
keep the single paper below.

**To publish a single real paper:** drop the PDF into `public/papers/`, named after the
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

Every label in the interface is the official term — Unmoderated Caucus,
General Speakers' List, Roll Call, Present and Voting,
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
│   ├── logo.png            The TISMUN logo (globe and wordmark)
│   ├── logo-mark.png       The globe alone, used as the browser-tab icon
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

The dashboard opens on **Guided Mode**. At the top is one panel: what the
committee does right now, with big buttons that do it. To give someone the
floor, the chair taps their country and the clock starts. Under that panel is
TISMUN's order of events for the current topic, with each step ticked off as
it happens:

1. Roll Call (**Everyone is here** marks all present and records the roll in one tap)
2. Reading Time (10 minutes by default)
3. Presentation of the Resolution: the Main Submitter, then Points of
   Information, then the floor yields back to the Chair
4. Speeches in Favour, each followed by Points of Information
5. Speeches Against, each followed by Points of Information
6. Unmoderated Caucus for Amendments (15 minutes by default; **Extend by 5
   minutes** is one tap). Delegates write amendments on their phones.
7. Debate on Amendments: for each amendment in the order it was submitted,
   its submitter's speech, then speeches for, then speeches against, then a
   vote. The amendment is shown with its changes in red and green.
8. More Amendments?: another caucus if needed, then those amendments are
   debated too
9. Closing Speeches: for or against the resolution as amended (the
   Main Submitter is offered first for closing remarks)
10. Voting Procedure. Note passing is suspended, and the projector says so.
11. Result, then **Move on to Topic 2**, and the same again
12. Awards (every committee but the Emergency Session), after the last
    resolution only: the chair picks the Best Delegate
    and the Honorable Mention right there in Guided Mode (the same pickers as
    the Awards page). The session is finished when both are given; they can
    still be changed until the closing ceremony.

Each step knows from the session whether it has happened, so the list cannot
disagree with the room. Every step also has a **Skip** for the day the room
does something unexpected. Flows live in `src/config/flows.ts`. Durations
(reading time, speeches, POIs) live in `DEBATE` in `src/config/rules.ts`.

### Resolutions and amendments

All twelve pre-written draft resolutions are on the site, one per committee per
topic, in `src/config/resolutionTexts.ts`, generated from the PDFs.
`src/config/resolutions.ts` says which committee debates which one:

- both HSCs share theirs
- HRC 1 and HRC 2 share the English pair
- HRC RU has the Russian translations

Delegates read them from **Resolution** in the menu, or from the card on their
home page. They can read them before the conference too.

**Proposing amendments.** Every country has its own copy of the resolution, on
the same page under **My copy**. A delegate taps **Change this** on a clause
and types; it saves as they type. They can remove a clause, or add a new one
after any clause. Changes show in red and green against the resolution as it
stands. **Share with other countries** lets any number of countries in the committee
edit the copy with them, live: whoever is typing in a clause holds it for a
few seconds, and the others see "Ali (Brazil) is editing". **Submit** turns
each changed clause into its own amendment, numbered in the order received,
with every country on the copy listed as a submitter, and clears the copy.
Submitters can withdraw an amendment until it is debated.

**What the chairs see.** Amendments arrive in Guided Mode and in
**Resolutions** within seconds. When an amendment passes, the resolution
changes for everyone at once: the delegate view, the chair's view and every
copy. A clause someone was still editing is flagged "The committee changed
this clause since you edited it", with **Keep my version** or **Use the new
wording**, so nobody can undo a passed amendment by accident.
**Resolutions** also has **Undo** on any result, for a vote recorded by
mistake. Delegates' screens show what the committee is doing right now, for
example "Now: Speeches against — Amendment 3".

**Emergency Session.** No resolution is pre-written. During the writing
caucus, delegates write draft resolutions in the same editor, with teammates
of the same country on one copy, and submit them. The chairs read the drafts
and press **Choose this one**. From then on it is debated and amended like
any other. Sharing a copy after submitting a draft from it updates that
draft's submitters too, until the chairs choose one. A draft's writers can
keep changing it until the chairs choose it, even while another draft is
being debated: under **My copy** it has its own tab, **Our Draft Resolution
N**, and **Save** updates the draft for everyone. Once a draft is on the
floor, anyone can still **Write a new draft** there and submit it; a draft
someone was still writing when the chairs chose one comes back there too, so
nothing is lost. When the committee has voted on a draft, Guided Mode's
Result step (and **Resolution & Amendments**) offers the drafts still waiting:
**Choose this one** puts the next on the floor, keeps the last one's result
and wording, and starts the order of business again for the new draft on
every chair's device. If the chairs later
choose a different draft, amendments to the first are set aside, not deleted.

**What the Secretariat sees.** Chairs and the Secretariat see everything
submitted, read-only: every amendment with its result and votes, and, in the
Emergency Session, a **Drafts** tab with every draft (chosen, not chosen or
withdrawn) and any set-aside amendments under **Amendments**. The Secretariat
also sees every copy still being written, live, under **Being written now**;
to everyone else a copy stays private to the countries on it until it is
submitted. The Secretariat's **Resolution** menu item opens the Emergency
Session on Day 2, with a picker for any other committee. The Emergency
Session panel on the Secretariat dashboard also lists every submitted draft,
every draft being written and every amendment, refreshed by itself, with a
link to the full text.

This needs the D1 binding. Its two tables (`res_committee`, `res_copy`) are
created on first use. The Secretariat's **Reset all sessions** clears them
too. The rules live in `src/lib/resolution.ts`, shared by the server and
demo mode. The API is `functions/api/res/[committeeId].ts`: delegates can
only edit copies they own or that were shared with them, only a committee's
chairs can record votes, and no email address is ever sent to other
delegates.

### Simplified procedure

TISMUN runs a simplified procedure, since most delegates are new to MUN: there
is **no Moderated Caucus**. Debate happens on the General Speakers' List and in
**Unmoderated Caucuses**, the committee's main tool — first in the sidebar, set
up with one tap (5, 10, 15 or 20 minutes; the delegation that moved it; a
purpose that defaults to "Editing the draft resolution"). **Motion for an
Unmoderated Caucus** is a one-tap button on the Speakers' List and in Guided
Mode: it puts the motion on the floor, takes the vote and opens the caucus in
one dialog. The projector shows "Unmoderated Caucus" with its purpose
underneath.

The motions are Unmoderated Caucus, Set / Change Speaking Time, Open / Set the
Agenda, Introduce a Draft Resolution, Introduce an Amendment, Close Debate, Move
into Voting Procedure, Table the Topic, Suspend the Meeting and Adjourn the
Meeting. They live in `src/config/rules.ts`, which stays editable should a
future year want the Moderated Caucus back.

### Voting

There is no separate voting screen. A Motion is voted on in **Motions**, where
it was raised. Amendments and the resolution are voted on in Guided Mode, at
the step they come up, or in **Resolutions**. Votes are by placard or roll
call, with the tally and the required majority in view. **Record the result**
saves it to the server. If the internet drops, it keeps retrying until the
result is saved.

### Awards

**Awards** gives Best Delegate and Honorable Mention, one of each per
committee, and one delegation cannot hold both. A chair can change or remove an
award until the closing ceremony; every change is logged. Awards survive
**Reset session**. The award names live in `src/config/awards.ts`.

| Shortcut | Action |
| --- | --- |
| `Space` | Start / pause the timer that is currently in play |
| `R` | Reset that timer |
| `N` | Next speaker |
| `F` | Open the projector display |

### Several chairs, one committee

Any number of chairs can run a committee at once, each from their own tab or
device — there is no lock and no Take over. Each device keeps its own timers
and steps; the Secretariat and the projector show whichever device reported
last. A device that opens the Chair Dashboard starts from the session another
device last reported, so it picks up where the others are.

This needs the D1 binding. The `committee_control` table is created on first
use, so there is no extra migration to run. Without D1 each device simply runs
on its own, as before.

**Projector mode** opens `/chair/display` in a second window — put it on the
room's projector and drive everything from the laptop. The two windows stay in
sync over `BroadcastChannel` (same browser, same machine).

---

## Emergency Session (Day 2)

A ninth committee, `emergency`, sits on Day 2. Its topic and background paper
are a surprise; delegates know their Emergency Session country in advance.

**Release is automatic.** At `releaseAt` in `src/config/emergency.ts`
(16 October, 08:30 Tashkent) the server unlocks the topic by itself — nobody
presses anything. Every check uses the **server's** clock, so changing a
device's date does nothing. Open pages ask every 30 seconds and show the topic
without a refresh, marked **New**. The Secretariat has **Release now** and
**Un-release** on the conference floor purely as a backup, plus **Switch to
Day 2 now** and **Back to Day 1**; each needs confirming and is recorded with
who did it. Undoing before the scheduled time goes back to the schedule, so
the topic still releases — and Day 2 still begins — on its own when the time
comes. Only after the scheduled time does Un-release (or Back to Day 1) hold
it back, until it is pressed again.

**Nothing leaks early.** Before release the API removes the topic, description
and paper link from the Emergency Session **on the server**, so they are in no
response, in no JavaScript file, and at no guessable address. The paper is not
in `/public`: it lives in Google Drive, shared only with the service account,
and `/api/papers/emergency` streams it after checking the session and the
release time — asked for early, it answers 403. Demo mode ships only a
placeholder topic.

**The real topic and paper are sealed in the code.** This repository is
public, so `functions/api/_lib/emergencySealed.ts` holds them encrypted
(AES-256-GCM) — unreadable on GitHub. The key is in a private Google Sheet,
*TISMUN Emergency Session key (do not delete or share)*, in the owner's Drive
and shared only with the service account. The server reads it only once the
topic is released (or for the owner's Day 2 preview), so before then there is
nothing to send. **Do not delete that sheet**, or the topic and paper will not
appear. Anything typed into the Emergency Session row of the Committees tab —
a topic, a description, a Drive link to a different paper — wins over the
sealed version.

**Your delegation.** Several delegates from different Day 1 committees
represent one country together. Each sees their own country's team — names and
Day 1 committees, never email addresses — worked out on the server, so no one
can see another country's roster. It shows as soon as countries are assigned,
even while the topic is locked. The Emergency Session chairs and the Secretariat
see every delegation.

**Day 2 focus.** From `focusFrom`, anyone in the Emergency Session — delegate
or chair — sees **only** the Emergency Session: it is their Home page ("Day 2 —
Emergency Session"), the Committees page lists nothing else, and a Day 1
committee's page sends them to it. A Day 1 chair can still open their Day 1
dashboard read-only from the switcher. The Secretariat, and everyone not in the
Emergency Session, keep their normal view.

**Its own order of business.** No draft resolution exists beforehand, so Guided
Mode follows a different flow: Roll Call, the chairs' Crisis Briefing (5:00),
the General Speakers' List, Motion for an Unmoderated Caucus (purpose "Writing
the draft resolution"), back to the GSL or another caucus, Register the Draft
Resolution once delegates submit one, its Presentation, debate and amendments,
Close Debate, Voting Procedure and the Result. The Emergency Session gives no
awards: it has no Awards step or page, and the Secretariat's awards table
leaves it out.

### Roles by day

A person's powers change when Day 2 begins (`focusFrom`, or the Secretariat's
**Switch to Day 2 now**). The server works this out on every request, from the
Sheet and its own clock, and refuses anything else with a 403 — the browser is
only told the answer (`src/lib/access.ts`, shared by both).

| | Day 1 | Day 2 |
| --- | --- | --- |
| Day 1 chair | Runs their committee | Their committee is **read-only**: Session Log and export, badge "Day 1 — read-only". Runs the Emergency Session only if marked `CHAIR` for it |
| Emergency Session chair | Their Day 1 role, nothing more | Runs the Emergency Session |
| Secretariat | Oversight of every committee | Oversight, always — plus the Emergency Session if marked `CHAIR` |
| Delegate | Their committee | Their committee, or the Emergency Session |

Anyone with two ways in on Day 2 gets a switcher in the top bar, set to the
one they need that day: a Day 1 chair who is an Emergency delegate sees **Day 2
· Emergency Session** / **Day 1 Dashboard**; a Secretariat member who chairs the
Emergency Session sees **Emergency Session (Chair)** / **Secretariat Overview**
and lands on the chair's seat, with the release controls one tap away. Keep at
least one Secretariat account with no Emergency Role, so someone is always on
oversight only.

The overrides and their record live in two D1 tables, `conference_flags` and
`conference_events`, created on first use — there is no migration to run.

## Secretariat

The `SECRETARIAT` role gets a **Conference floor** view: every
committee at once, with its current status, live timers, who has the floor,
attendance and quorum, Motions on the floor, Draft Resolutions, every
committee's awards (with a CSV download for printing certificates), and a
combined session log across the whole conference. Clicking a committee opens a full
read-only view of it — the same information the chair sees, with no controls.

It refreshes every two seconds. Timers tick smoothly between refreshes because
what is sent is the timer's *state*, not a number of seconds, so the watching
browser runs its own countdown from a single message.

**Reset all sessions.** At the bottom of the Conference floor, for use after
testing: it clears every committee's session — roll call, timers, speakers,
motions, resolutions, votes, session logs and **awards** — once someone types
`RESET` to confirm. (A chair's own "Reset session" keeps awards; this does
not.) The server wipes its copy at once and records when and by whom. Chairs'
devices wipe theirs as soon as they next hear from the server (within about ten
seconds for one that is open), and until they have, the server refuses their
reports — so a laptop that was offline during the reset cannot bring the old
session back. The Emergency Session release and Day 2 settings are untouched.
Needs the D1 binding.

### Live sync across devices (Cloudflare D1)

Without a database the Secretariat view still works, but only for committees
running **in the same browser** — it reads what each chair's dashboard has
already saved to local storage. To watch chairs on their own laptops, bind a
D1 database:

**1. Create the database.** Cloudflare dashboard → **Storage & Databases → D1
→ Create database**, named `tismun`.

**2. Create its tables.** Open the database → **Console** tab → paste the
contents of `migrations/0001_live_sync.sql` → Execute.

The dashboard console is the reliable way to do this. `wrangler d1 execute`
resolves database *names* through a `wrangler.toml`, which this project does
not ship (a stale `database_id` in one would break Pages builds), so the CLI
route needs the database's UUID rather than its name.

**3. Bind it.** Your Pages project → **Settings → Functions → D1 database
bindings → Add binding**, variable name **`DB`**, database `tismun`.

**4. Redeploy.** Deployments → Retry deployment. Bindings only apply to new
deployments.

If something is wrong, `https://your-site.pages.dev/api/live` says what — a
missing table names itself rather than failing the request.

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

### Owner and sign-in log

Accounts listed in the `OWNER_EMAILS` environment variable are the site's
owners. The addresses live in Cloudflare, not in the code, so none is ever
committed. An owner keeps their own role from the `Users` sheet (a chair stays
a chair) and also gets an **Owner** tab (`/owner`) that holds everything
below, and:

- **Secretariat access**: the Conference floor, Reset all sessions, and the
  Emergency Session tools, all checked again on the server.
- **Sign-in log**, at the bottom of the Owner tab, which no one else can open,
  not even the Secretariat (`/activity` still leads there):
  - **Online now**: anyone with the site open in the last three minutes. An
    open page checks in every two minutes.
  - **Activity**: each sign-in and sign-out, each return visit after 15
    minutes or more away, and each Google account turned away because it is
    not on the roster. Every entry shows the time, the person's role,
    committee and country, and the device type (for example "iPhone ·
    Safari").

- **Test the site**, as a delegate or a chair: in the Owner tab, pick
  **Test as a delegate** (a committee and a country) or **Test as a chair** (a
  committee). The whole site then looks exactly as it does for that person —
  home page, committee, papers, delegation, resolution, Chair Dashboard — with
  a bar at the top to **Switch** or **Stop testing**. Choose **Day 2, topic
  released** to see the Emergency Session as it will open, even while it is
  locked: only you see it; everyone else still sees it locked. The Emergency
  Session's chair is always seen on Day 2, when it sits; the Owner tab has a
  shortcut for each side of it.
  - **A practice copy.** While you test, every committee's session and
    resolution are a practice copy (stored under the committee id with
    `~test` on the end), so a test chair and test delegates see each other but
    never the real committee, and the real one never sees them. Test as a
    chair on a laptop and as a delegate on a phone to try both sides together.
    The Secretariat's conference floor leaves practice copies out. **Clear
    practice copies** in the Owner tab empties them all.
  - The seat rides in its own cookie, which the server honours only for
    accounts in `OWNER_EMAILS`. A test seat brings only that seat's powers —
    never the Secretariat's or a real chair's — and is not logged as anyone's
    visit.

The log is kept for 30 days and needs the D1 binding. Its two tables are
created on first use, so no migration is needed. Recording is best-effort:
if the database is down, people still sign in normally. To change the owners,
edit the variable, then retry the **newest** deployment, the one at the top of
*All deployments*. Do not retry the one on the *Production* card: while a
newer build is still finishing, that card shows the previous version, and
retrying it puts the old code back live.

In demo mode, `yassir.ga2@demo.tis` is the owner, and the log records sign-ins
in this browser only.

---

## After the conference: the site is closed

While `SITE_CLOSED.closed` in `src/config/closed.ts` is `true`, the site is
closed. Everyone who opens it sees "TISMUN 2026 is over", and nobody can sign
in except the accounts in `OWNER_EMAILS`. An owner signs in, sees the same
page, and is asked **Do you want to still proceed?** — once per browser tab.
The server enforces it on every request, so a sign-in left open on someone's
laptop stops working too.

Nothing is deleted: the Google Sheet, the database and every Cloudflare
setting stay as they are, ready for the next conference. To open the site
again, set `closed` to `false` (and update the dates and copy in
`src/config/conference.ts`), then deploy.

## For Phase 2, I need from you

1. **Optional: the school's Google Workspace domain** — only if every
   participant signs in with a school account and you want others refused
   outright. The sheet already controls who gets in without it.
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
8. **The delegations** — which country each delegate represents in each
   committee. The committees, chairs and rooms are already the real ones; only
   the delegate lists are still invented.
9. **Who holds the Secretariat account.** Add more `SECRETARIAT` rows if more
   than one person needs the conference-floor view.
