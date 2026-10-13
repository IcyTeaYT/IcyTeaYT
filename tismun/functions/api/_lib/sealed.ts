import { EMERGENCY_ID } from './emergency';
import type { Env } from './env';
import { b64urlDecode } from './jwt';
import { getAccessToken, type SheetCommittee } from './sheets';
import { KEY_SHEET_ID, SEALED } from './emergencySealed';

/**
 * The Emergency Session's topic, description and background paper, kept in
 * the code — encrypted, because the repository is public.
 *
 * The key is not in the code. It sits in a private Google Sheet that only the
 * owner and the service account can open (KEY_SHEET_ID), so nobody reading
 * the repository can unlock anything. The server fetches the key only once
 * the topic is released — or for the owner previewing it — so before 8:30 on
 * Day 2 there is nothing anyone else can be sent.
 *
 * Whatever the Committees tab says wins: a topic, description or paper link
 * typed into the Emergency Session row replaces the sealed one.
 */

/** In the Background Paper URL cell: "use the sealed paper". Never sent out. */
export const SEALED_PAPER = 'sealed:emergency';

interface Unsealed {
  topic: string;
  description: string;
}

let key: CryptoKey | null = null;
let meta: Unsealed | null = null;
let failedAt = 0;
const RETRY_MS = 30_000;

async function sealKey(env: Env): Promise<CryptoKey | null> {
  if (key) return key;
  if (!KEY_SHEET_ID || !SEALED) return null;
  // A missing or unreadable key is retried every half minute, not on every request.
  if (Date.now() - failedAt < RETRY_MS) return null;
  try {
    const token = await getAccessToken(env);
    const response = await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${encodeURIComponent(KEY_SHEET_ID)}/values/A1:B10?majorDimension=ROWS`,
      { headers: { Authorization: `Bearer ${token}` } },
    );
    if (!response.ok) throw new Error(`key sheet ${response.status}`);
    const body = (await response.json()) as { values?: string[][] };
    const cell = (body.values ?? []).flat().map((value) => value.trim()).find((value) => value.startsWith('k1.'));
    if (!cell) throw new Error('no key in the key sheet');
    key = await crypto.subtle.importKey('raw', b64urlDecode(cell.slice(3)), 'AES-GCM', false, ['decrypt']);
    return key;
  } catch (error) {
    failedAt = Date.now();
    console.error('Emergency Session key unavailable:', error);
    return null;
  }
}

async function open(env: Env, part: { iv: string; data: string }): Promise<Uint8Array | null> {
  const unlock = await sealKey(env);
  if (!unlock) return null;
  try {
    const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64urlDecode(part.iv) }, unlock, b64urlDecode(part.data));
    return new Uint8Array(plain);
  } catch (error) {
    console.error('Emergency Session content could not be unlocked:', error);
    return null;
  }
}

/** The sealed topic and description. Call only once the topic is released for this person. */
async function unsealedMeta(env: Env): Promise<Unsealed | null> {
  if (meta) return meta;
  if (!SEALED) return null;
  const bytes = await open(env, SEALED.meta);
  if (!bytes) return null;
  meta = JSON.parse(new TextDecoder().decode(bytes)) as Unsealed;
  return meta;
}

/** The sealed background paper, as PDF bytes. Call only once the topic is released for this person. */
export async function sealedPaper(env: Env): Promise<Uint8Array | null> {
  if (!SEALED) return null;
  return open(env, SEALED.paper);
}

/**
 * The committees, with the Emergency Session's blank cells filled from the
 * sealed content. Call only once the topic is released for this person.
 */
export async function withSealedEmergency<T extends SheetCommittee>(env: Env, committees: T[]): Promise<T[]> {
  const index = committees.findIndex((row) => (row['Committee ID'] ?? '').trim() === EMERGENCY_ID);
  const row = committees[index];
  if (!row || !SEALED) return committees;
  const blank = (value: string | undefined) => !(value ?? '').trim();
  if (!blank(row['Topic 1']) && !blank(row.Description) && !blank(row['Background Paper URL'])) return committees;
  const content = await unsealedMeta(env);
  if (!content) return committees;
  const filled: T = {
    ...row,
    'Topic 1': blank(row['Topic 1']) ? content.topic : row['Topic 1'],
    Description: blank(row.Description) ? content.description : row.Description,
    'Background Paper URL': blank(row['Background Paper URL']) ? SEALED_PAPER : row['Background Paper URL'],
  };
  return committees.map((entry, at) => (at === index ? filled : entry));
}
