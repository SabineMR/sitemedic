#!/usr/bin/env node

const path = require('node:path');
const cp = require('node:child_process');

const root = path.resolve(__dirname, '..', '..');

const checks = [
  {
    description: 'Migration 168 contains integrity config + repeat-offender controls',
    command:
      'rg -n "marketplace_integrity_config|repeat_offender|review_sla_hours" "supabase/migrations/168_marketplace_integrity_calibration.sql"',
  },
  {
    description: 'Migration 169 contains optional hardening signal taxonomy',
    command:
      'rg -n "REFERRAL_NETWORK_CLUSTER|CO_SHARE_POLICY_BREACH|integrity_alert" "supabase/migrations/169_marketplace_integrity_optional_automation.sql"',
  },
  {
    description: 'Integrity overview API and cron report routes exist',
    command:
      'rg -n "integrity/overview|integrity-sla-report" "web/app/api/platform/marketplace/integrity/overview/route.ts" "web/app/api/cron/integrity-sla-report/route.ts"',
  },
  {
    description: 'Signal ingestion includes leakage + optional hardening signals',
    command:
      'rg -n "THREAD_NO_CONVERT|PROXIMITY_CLONE|MARKETPLACE_TO_DIRECT_SWITCH|EVENT_COLLISION_DUPLICATE|CO_SHARE_POLICY_BREACH" "web/lib/marketplace/integrity/signals.ts"',
  },
  {
    description: 'Escalation queue and case resolution APIs are present',
    command:
      'rg -n "marketplace_integrity_cases|resolve" "web/app/api/platform/marketplace/entities/route.ts" "web/app/api/platform/marketplace/integrity/cases/[caseId]/resolve/route.ts"',
  },
];

function run(description, command) {
  console.log(`\n[smoke] ${description}`);
  cp.execSync(command, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  });
}

try {
  for (const check of checks) {
    run(check.description, check.command);
  }
  console.log('\n[smoke] PASS: integrity smoke checks passed.');
} catch (err) {
  console.error('\n[smoke] FAIL: integrity smoke checks failed.');
  process.exit(1);
}
