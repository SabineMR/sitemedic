#!/usr/bin/env node

const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');
const migrationsDir = path.join(root, 'supabase', 'migrations');
const strictCli = process.argv.includes('--strict-cli');

const allowNonStandard = new Set(['149b_remainder_charge_cron.sql']);
const requiredIntegrityMigrations = ['164', '165', '166', '167', '168', '169'];

function fail(msg) {
  console.error(`\n[preflight] FAIL: ${msg}`);
  process.exit(1);
}

if (!fs.existsSync(migrationsDir)) {
  fail(`Migrations directory missing: ${migrationsDir}`);
}

const files = fs
  .readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort((a, b) => a.localeCompare(b));

if (files.length === 0) {
  fail('No migration files found.');
}

const nonStandard = files.filter((file) => {
  if (allowNonStandard.has(file)) return false;
  return !/^[0-9]+_[a-z0-9_]+\.sql$/i.test(file);
});

if (nonStandard.length > 0) {
  fail(`Non-standard migration filenames: ${nonStandard.join(', ')}`);
}

const migrationPrefixes = files
  .filter((f) => !allowNonStandard.has(f))
  .map((f) => f.split('_')[0]);

const duplicates = migrationPrefixes.filter((prefix, idx) => migrationPrefixes.indexOf(prefix) !== idx);
if (duplicates.length > 0) {
  fail(`Duplicate migration prefixes found: ${Array.from(new Set(duplicates)).join(', ')}`);
}

for (const req of requiredIntegrityMigrations) {
  if (!migrationPrefixes.includes(req)) {
    fail(`Required integrity migration missing: ${req}`);
  }
}

let migrationListOutput = null;
try {
  migrationListOutput = cp.execSync('supabase migration list --local', {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  });
} catch (err) {
  const text = String(err.stderr || err.message || err);
  if (strictCli) {
    fail(`supabase migration list --local failed: ${text}`);
  }
  console.warn('\n[preflight] WARN: Could not run `supabase migration list --local`.');
  console.warn(`[preflight] WARN: ${text.trim()}`);
}

if (migrationListOutput) {
  for (const req of requiredIntegrityMigrations) {
    const pattern = new RegExp(`\\b${req}\\b\\s*\\|\\s*\\b${req}\\b`);
    if (!pattern.test(migrationListOutput)) {
      fail(`Migration ${req} not applied in local migration history.`);
    }
  }
}

console.log('\n[preflight] PASS');
console.log(`[preflight] Checked ${files.length} migration files`);
console.log(`[preflight] Integrity migrations present: ${requiredIntegrityMigrations.join(', ')}`);
if (allowNonStandard.size > 0) {
  console.log(`[preflight] Allowed legacy exceptions: ${Array.from(allowNonStandard).join(', ')}`);
}
