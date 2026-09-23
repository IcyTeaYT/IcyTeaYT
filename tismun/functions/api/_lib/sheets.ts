import type { Env } from './env';
import { importServiceAccountKey, signServiceAccountJwt } from './jwt';
import { testAccountByEmail } from './testLogins';

/**
 * Read-only access to the conference Google Sheet through a service account.
 *
 * ┌─ PHASE 2 SETUP ─────────────────────────────────────────────────────────┐
 * │ 1. Google Cloud console → enable the Google Sheets API.                 │
 * │ 2. IAM & Admin → Service Accounts → create one → Keys → Add key →       │
 * │    JSON. Copy `client_email` into GOOGLE_SA_EMAIL and `private_key`     │
 * │    into GOOGLE_SA_PRIVATE_KEY.                                          │
 * │ 3. Open the Sheet → Share → paste the service account address → give    │
 * │    it VIEWER. It needs nothing more: this API never writes.             │
 * │ 4. Put the Sheet's ID (the long string in its URL) into SHEET_ID.       │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

const TOKEN_ENDPOINT = 'https://oauth2.googleapis.com/token';
/**
 * Read the sheet, and read the Emergency Session background paper from Google
 * Drive — both read-only, and both only files shared with the service account.
 */
const SCOPE = [
  'https://www.googleapis.com/auth/spreadsheets.readonly',
  'https://www.googleapis.com/auth/drive.readonly',
].join(' ');

export const USERS_TAB = 'Users';
export const COMMITTEES_TAB = 'Committees';

/** How long a fetched tab is reused. Edits to the sheet appear within a minute. */
const CACHE_TTL_MS = 60_000;

interface CacheEntry {
  at: number;
  rows: Record<string, string>[];
}

// Workers reuse an isolate across requests, so this cache survives between them
// on a warm isolate and simply misses on a cold one. That is the right trade:
// never stale for more than a minute, and no external cache to operate.
const sheetCache = new Map<string, CacheEntry>();
let tokenCache: { token: string; expiresAt: number } | null = null;

export async function getAccessToken(env: Env): Promise<string> {
  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) return tokenCache.token;

  const now = Math.floor(Date.now() / 1000);
  const key = await importServiceAccountKey(env.GOOGLE_SA_PRIVATE_KEY);
  const assertion = await signServiceAccountJwt(key, {
    iss: env.GOOGLE_SA_EMAIL,
    scope: SCOPE,
    aud: TOKEN_ENDPOINT,
    iat: now,
    exp: now + 3600,
  });

  const response = await fetch(TOKEN_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  });

  if (!response.ok) {
    throw new Error(`Google token exchange failed (${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as { access_token: string; expires_in: number };
  tokenCache = { token: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return body.access_token;
}

/**
 * Header cells are normalised: trimmed, and any trailing parenthetical dropped,
 * so a column headed "Country Code (ISO 2-letter)" is read as "Country Code"
 * and the Secretariat can annotate headers without breaking the site.
 */
const normaliseHeader = (header: string): string => header.replace(/\s*\([^)]*\)\s*$/, '').trim();

export async function readTab(env: Env, tab: string): Promise<Record<string, string>[]> {
  const cached = sheetCache.get(tab);
  if (cached && Date.now() - cached.at < CACHE_TTL_MS) return cached.rows;

  const token = await getAccessToken(env);
  const url =
    `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(env.SHEET_ID)}` +
    `/values/${encodeURIComponent(tab)}?majorDimension=ROWS`;

  const response = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
  if (!response.ok) {
    throw new Error(`Sheet read failed for tab "${tab}" (${response.status}): ${await response.text()}`);
  }

  const body = (await response.json()) as { values?: string[][] };
  const [headerRow, ...dataRows] = body.values ?? [];
  if (!headerRow) return [];

  const headers = headerRow.map(normaliseHeader);
  const rows = dataRows
    .map((row) => {
      const record: Record<string, string> = {};
      headers.forEach((header, index) => {
        if (header) record[header] = (row[index] ?? '').trim();
      });
      return record;
    })
    // Trailing blank rows are the normal state of a spreadsheet.
    .filter((row) => Object.values(row).some(Boolean));

  sheetCache.set(tab, { at: Date.now(), rows });
  return rows;
}

export interface SheetUser {
  Email: string;
  'Full Name': string;
  Role: string;
  'Committee ID': string;
  Country: string;
  'Country Code'?: string;
  Title?: string;
  /** Blank: not in the Emergency Session. DELEGATE or CHAIR otherwise. */
  'Emergency Role'?: string;
  /** The country an Emergency Session delegate represents. */
  'Emergency Country'?: string;
}

export interface SheetCommittee {
  'Committee ID': string;
  Name: string;
  Abbreviation: string;
  'Topic 1': string;
  'Topic 2': string;
  Chairs: string;
  Room: string;
  'Background Paper URL': string;
  Description: string;
}

export async function findUser(env: Env, email: string): Promise<SheetUser | null> {
  // Shared test accounts, while TEST_LOGINS=on. They are not in the sheet.
  const test = testAccountByEmail(env, email);
  if (test) return test;

  const rows = (await readTab(env, USERS_TAB)) as unknown as SheetUser[];
  const needle = email.trim().toLowerCase();
  return rows.find((row) => (row.Email ?? '').trim().toLowerCase() === needle) ?? null;
}

/** Every row of the Users tab. */
export async function readUsers(env: Env): Promise<SheetUser[]> {
  return (await readTab(env, USERS_TAB)) as unknown as SheetUser[];
}

export async function readCommittees(env: Env): Promise<SheetCommittee[]> {
  return (await readTab(env, COMMITTEES_TAB)) as unknown as SheetCommittee[];
}
