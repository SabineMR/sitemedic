# Deferred Items (Phase 39)

## Out-of-scope issues discovered during verification

- Historical lint blockers that previously failed `pnpm --dir web lint` have been cleaned up in a dedicated follow-up pass.
- Current lint output is warning-only (React hook dependency warnings and image optimization/a11y warnings in legacy files); there are no remaining lint **errors** blocking verification.
- `pnpm --dir web exec tsc --noEmit` passes.

## Remaining quality debt (non-blocking)

- Hook dependency warnings across older admin and shared components.
- Image optimization/accessibility warnings in selected document and messaging components.
- Next.js deprecation notice for `next lint`; migrate to ESLint CLI via `next-lint-to-eslint-cli` codemod in a future maintenance plan.
