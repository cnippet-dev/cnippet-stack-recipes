## Summary
<!-- What does this PR do, and for which recipe? -->

## Type of change
- [ ] New recipe
- [ ] Recipe fix
- [ ] New option in an existing recipe
- [ ] Guide (`guide.mdx`)
- [ ] Hosts / scripts / tooling
- [ ] Docs

## Recipe checklist
<!-- Skip for tooling/docs-only PRs. See CONTRIBUTING.md. -->
- [ ] Tested for real in a build app (not only typechecked)
- [ ] Code was changed in the build app and pulled, not edited in `files/` (except `append` fragments)
- [ ] `version` bumped
- [ ] No step id renamed or removed (or it's a major version bump)
- [ ] `bun run validate-recipes <name>` passes
- [ ] `bun run check-coverage <name>` passes
- [ ] `bun run compose <name> --build` passes
- [ ] `bun run compose <name> --through <id> --typecheck` passes for every step
- [ ] Every prompt's "no" path thought through
- [ ] No real secrets anywhere

## Errors found while testing
<!-- Exact error messages from "break it on purpose". They go into the guide. -->
