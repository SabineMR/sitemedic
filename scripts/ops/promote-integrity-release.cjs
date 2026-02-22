#!/usr/bin/env node

const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');

function run(command) {
  console.log(`\n[promote] $ ${command}`);
  cp.execSync(command, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
}

try {
  run('node scripts/ops/migration-preflight.cjs --strict-cli');
  run('pnpm --dir web exec tsc --noEmit');
  run('pnpm --dir web lint');
  run('pnpm --dir web-marketplace exec tsc --noEmit');
  run('pnpm --dir web-marketplace lint');
  run('pnpm --dir web exec vitest run "lib/marketplace/attribution/__tests__/pass-on-invariants.test.ts" "lib/marketplace/integrity/__tests__/signals-risk-band.test.ts"');
  run('node scripts/ops/integrity-smoke.cjs');

  console.log('\n[promote] PASS: integrity release guardrails green.');
} catch (err) {
  console.error('\n[promote] FAIL: promotion guardrail blocked release.');
  process.exit(1);
}
