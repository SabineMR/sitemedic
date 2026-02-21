# Deferred Items (Phase 39)

## Out-of-scope issues discovered during verification

- `pnpm --dir web lint` fails due to pre-existing lint errors across unrelated files (for example legal policy pages, admin pages, and messaging components).
- These errors are not caused by the Phase 39-01 changes and were not modified in this execution.

- Re-ran `pnpm --dir web lint` during Phase 39-02 validation; failures remain in unrelated legacy files (for example legal content pages, `components/ui/what3words-input.tsx`, and parse error in `web/lib/invoices/pdf-generator.ts`).
- New Phase 39-02 files pass `pnpm --dir web exec tsc --noEmit`; lint debt remains deferred because it predates this plan and exceeds current task scope.
