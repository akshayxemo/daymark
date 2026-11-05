## Summary

<!-- What does this change and why? Link related issues with "Closes #123". -->

## Type of change

<!-- Delete the lines that do not apply. -->

- Bug fix (non-breaking change that fixes an issue)
- New feature (non-breaking change that adds functionality)
- Breaking change (existing behaviour, API or configuration changes)
- Refactor, performance or internal change
- Documentation
- Build, CI or tooling

## How was this tested?

<!-- Commands you ran, manual checks performed, environments used. -->

## Checklist

- [ ] `pnpm typecheck` passes
- [ ] `pnpm lint` passes
- [ ] `pnpm test` passes, and `pnpm test:integration` passes when server behaviour changed
- [ ] New or changed behaviour is covered by tests
- [ ] Documentation (`README.md`, `docs/`, `.env.example`) is updated where behaviour or configuration changed
- [ ] `CHANGELOG.md` has an entry under "Unreleased" for user-visible changes
- [ ] No secrets, credentials or machine-specific paths are included
- [ ] If the Drizzle schema changed: migration generated with `pnpm db:generate` and the SQL in `drizzle/` is committed
- [ ] User-owned data access remains scoped to the server-verified user id
