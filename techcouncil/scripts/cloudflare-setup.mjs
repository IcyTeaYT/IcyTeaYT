#!/usr/bin/env node
/**
 * One-command Cloudflare setup and deploy for the TIS Tech Council site.
 * Safe to run again: everything that already exists is reused.
 *
 *   npm run cf:setup
 *
 * Needs Cloudflare access, either:
 *   - CLOUDFLARE_API_TOKEN (Account > Cloudflare Pages > Edit, Account > D1 > Edit)
 *     plus CLOUDFLARE_ACCOUNT_ID, or
 *   - `npx wrangler login` done beforehand on your own computer.
 *
 * Optional:
 *   TC_ADMIN_PASSWORD     sets or changes the /admin password (never printed)
 *   TC_PRODUCTION_BRANCH  git branch Cloudflare treats as production (default: master)
 *
 * Steps: check login, create or find the D1 database, write its id into
 * wrangler.toml, apply schema.sql, create the Pages project, set the
 * ADMIN_PASSWORD and IP_SALT secrets, build, deploy, print the live URL.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROJECT = 'tis-tech-council';
const DATABASE = 'tis-tech-council';
const BRANCH = process.env.TC_PRODUCTION_BRANCH || 'master';

function run(cmd, args, { input } = {}) {
  const r = spawnSync(cmd, args, {
    cwd: ROOT,
    encoding: 'utf8',
    input,
    env: { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });
  return { ok: r.status === 0, out: r.stdout ?? '', err: r.stderr ?? '' };
}
const wrangler = (args, opts) => run('npx', ['wrangler', ...args], opts);

function step(title) {
  console.log(`\n→ ${title}`);
}
function fail(message, r) {
  console.error(`\n✗ ${message}`);
  if (r) console.error(`${r.err}\n${r.out}`.trim().split('\n').slice(-20).join('\n'));
  process.exit(1);
}
/** Wrangler can print banners and warnings around --json output; take the JSON part. */
function parseJson(text, open = '[', close = ']') {
  const a = text.indexOf(open);
  const b = text.lastIndexOf(close);
  if (a < 0 || b < a) return null;
  try {
    return JSON.parse(text.slice(a, b + 1));
  } catch {
    return null;
  }
}

// 1. Login
step('Checking Cloudflare login');
const who = wrangler(['whoami']);
if (!who.ok || /not authenticated/i.test(who.out + who.err)) {
  fail('Not logged in to Cloudflare. Set CLOUDFLARE_API_TOKEN and CLOUDFLARE_ACCOUNT_ID, or run `npx wrangler login`.', who);
}
console.log('  logged in');

// 2. D1 database
step(`Finding D1 database "${DATABASE}"`);
const findDb = () => {
  const r = wrangler(['d1', 'list', '--json']);
  if (!r.ok) fail('Could not list D1 databases.', r);
  const list = parseJson(r.out) ?? [];
  return list.find((d) => d.name === DATABASE);
};
let db = findDb();
if (!db) {
  console.log('  not found, creating it');
  const created = wrangler(['d1', 'create', DATABASE]);
  if (!created.ok) fail('Could not create the D1 database.', created);
  db = findDb();
}
if (!db?.uuid) fail('Could not read the D1 database id.');
console.log(`  ${db.uuid}`);

// 3. wrangler.toml binding
step('Writing the database id into wrangler.toml');
const tomlPath = path.join(ROOT, 'wrangler.toml');
const toml = readFileSync(tomlPath, 'utf8');
const nextToml = toml.replace(/database_id\s*=\s*"[^"]*"/, `database_id = "${db.uuid}"`);
if (nextToml !== toml) writeFileSync(tomlPath, nextToml);
console.log(nextToml !== toml ? '  updated' : '  already set');

// 4. Schema (idempotent: CREATE ... IF NOT EXISTS)
step('Applying schema.sql to the remote database');
const migrate = wrangler(['d1', 'execute', DATABASE, '--remote', '--file=./schema.sql', '--yes']);
if (!migrate.ok) fail('Could not apply schema.sql.', migrate);
console.log('  done');

// 5. Pages project
step(`Finding Pages project "${PROJECT}"`);
const findProject = () => {
  const r = wrangler(['pages', 'project', 'list', '--json']);
  if (!r.ok) fail('Could not list Pages projects.', r);
  const list = parseJson(r.out) ?? [];
  return list.find((p) => Object.values(p).some((v) => v === PROJECT));
};
let project = findProject();
if (!project) {
  console.log(`  not found, creating it (production branch: ${BRANCH})`);
  const created = wrangler(['pages', 'project', 'create', PROJECT, '--production-branch', BRANCH]);
  if (!created.ok && !/already exists/i.test(created.out + created.err)) fail('Could not create the Pages project.', created);
  project = findProject();
}
console.log('  ready');

// 6. Secrets
step('Setting secrets');
const secretList = wrangler(['pages', 'secret', 'list', '--project-name', PROJECT]);
const existing = secretList.ok ? secretList.out : '';
const putSecret = (name, value) => {
  const r = wrangler(['pages', 'secret', 'put', name, '--project-name', PROJECT], { input: value });
  if (!r.ok) fail(`Could not set ${name}.`, r);
};
if (process.env.TC_ADMIN_PASSWORD) {
  putSecret('ADMIN_PASSWORD', process.env.TC_ADMIN_PASSWORD);
  console.log('  ADMIN_PASSWORD set from TC_ADMIN_PASSWORD');
} else if (/ADMIN_PASSWORD/.test(existing)) {
  console.log('  ADMIN_PASSWORD already set (kept)');
} else {
  console.log('  ! ADMIN_PASSWORD is not set, so /admin will refuse to open.');
  console.log('    Set TC_ADMIN_PASSWORD and run this again, or run:');
  console.log(`    npx wrangler pages secret put ADMIN_PASSWORD --project-name ${PROJECT}`);
}
if (/IP_SALT/.test(existing)) {
  console.log('  IP_SALT already set (kept)');
} else {
  putSecret('IP_SALT', randomBytes(32).toString('hex'));
  console.log('  IP_SALT set to a new random value');
}

// 7. Build
step('Building');
const build = run('npm', ['run', 'build']);
if (!build.ok) fail('Build failed.', build);
console.log('  done');

// 8. Deploy
step(`Deploying to Cloudflare Pages (branch: ${BRANCH})`);
const deploy = wrangler(['pages', 'deploy', 'dist', '--project-name', PROJECT, '--branch', BRANCH, '--commit-dirty=true']);
if (!deploy.ok) fail('Deploy failed.', deploy);
const deployUrl = (deploy.out + deploy.err).match(/https:\/\/[^\s]+\.pages\.dev/)?.[0];
const domains = project ? Object.values(project).find((v) => typeof v === 'string' && v.includes('.pages.dev')) : undefined;
const liveUrl = domains ? `https://${String(domains).split(',')[0].trim().replace(/^https?:\/\//, '')}` : `https://${PROJECT}.pages.dev`;

console.log(`\n✓ Live at ${liveUrl}`);
if (deployUrl && !deployUrl.startsWith(liveUrl)) console.log(`  This deployment: ${deployUrl}`);
console.log(`  Admin page: ${liveUrl}/admin`);
if (nextToml !== toml) console.log('\n  wrangler.toml now holds the real database id; commit it.');
