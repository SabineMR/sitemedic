# Deferred Items (Phase 39-01)

## Out-of-scope issues discovered during verification

- `pnpm --dir web lint` fails due to pre-existing lint errors across unrelated files (for example legal policy pages, admin pages, and messaging components).
- These errors are not caused by the Phase 39-01 changes and were not modified in this execution.
