---
name: sync-main
description: Daily sync of the V2 UI remake branch with main. Merges origin/main, resolves conflicts with the overlay rules, runs the checks, triages drift with scripts/v2-drift/drift.mjs, and records the synced SHA. Use when the user says "sync with main", "daily sync", "merge main", "pull main in", "drift check", or asks what changed on main for the remake.
---

# Sync the V2 remake branch with main

The V2 redesign ships as one big-bang cutover from `feat/BCH-1174-ux-resume`, and main is merged in daily. Work only on the branch. Never change main, and never ask main's contributors to change anything. Why and how: `ux-audit-2026-02-26-1426/ui-v2-migration-prd.md` §4.4 and `migration-governance.md` ("Daily sync routine"). If those docs disagree with this skill, the docs win; fix this file.

## Ground rules

- Merge, never rebase. Never push unless the user asks.
- Main-owned files stay byte-identical to main. Branch behavior lives in branch-only files: `src/router/v2.ts`, `src/AppV2Root.vue`, `src/views/layouts/AppShell.vue`, `src/views/system-v2/*`, `*-v2/` and `components/v2/`. The accepted exceptions are the `src/volt/*` wrappers, the V2 tokens in `src/assets/main.css`, the two import lines in `src/main.ts`, and the `lucide-vue-next` dependency (PRD §4.4).
- Don't edit `AGENTS.md`, `CLAUDE.md`, CI workflows or other main-owned config on the branch.
- Commits are signed with the user's SSH key through the SSH agent, which the Claude Code sandbox blocks. Run `git commit` (and `git fetch`) outside the sandbox. If signing still fails, don't disable signing: stop and give the user the exact `git commit` command.
- The git stash stack is shared with other worktrees. Don't use bare `git stash`.

## Steps

### 1. Preflight

```sh
git status --short            # must be clean; if not, ask the user what to do
git branch --show-current     # must be feat/BCH-1174-ux-resume
git fetch origin
git log --oneline HEAD..origin/main | wc -l   # 0 means nothing to sync: report it and stop
```

`origin` is reached over SSH, which the Claude Code sandbox blocks ("Please make sure you have the correct access rights"). Re-run only the fetch outside the sandbox (it goes through the permission prompt), or ask the user to run `git fetch origin`. Don't use local `main` instead: it is checked out in the other worktree (`/Volumes/Vault/repos/ccf/ui`) and only moves when the user pulls there.

### 2. Preview before merging

```sh
node scripts/v2-drift/drift.mjs --to origin/main
```

Read "Conflict watch" (files likely to conflict) and "Routes main added or removed". Tell the user the commit count and anything notable before merging.

### 3. Merge

```sh
git merge --no-ff --no-commit origin/main
```

Resolve each conflict by file type:

| File                                                                                                                                                    | Resolution                                                                                                                              |
| ------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| `src/router/index.ts`, `src/App.vue`, `src/views/layouts/App.vue`, `src/views/SystemView.vue`, `src/views/LeftSideNav.vue` or any other main-owned file | `git checkout --theirs <file>`, then re-apply the branch behavior in its overlay file, not in the main-owned file.                      |
| `package.json`, `package-lock.json`                                                                                                                     | Take main's versions (`git checkout --theirs`), then run `npm install lucide-vue-next`.                                                 |
| `src/main.ts`                                                                                                                                           | Take main's version, then restore the two branch imports: `import App from './AppV2Root.vue';` and `import router from './router/v2';`. |
| `src/volt/*`, `src/assets/main.css`                                                                                                                     | Real merge: keep main's change and the V2 branch logic.                                                                                 |
| Branch-only files (`*-v2/`, `components/v2/`, `ux-audit-*`, `scripts/v2-drift/`)                                                                        | Main never touches these. A conflict here means something unexpected happened, so ask the user.                                         |

If `package-lock.json` changed, run `npm install` before the checks.

### 4. Checks

```sh
npx vitest run src/router     # fast: the overlay spec fails if main renamed or removed a route it targets
make reviewable
npm run build
```

- If the overlay reports `[ui-v2] Route overlay targets routes missing…`, find the new route name in `src/router/index.ts` and update `src/router/v2.ts`.
- Fix failures in branch-only files. If a main spec fails because of branch behavior, move that behavior into an overlay instead of editing the spec.

### 5. Commit the merge

```sh
git commit --no-edit
```

Run it outside the sandbox so signing can reach the SSH agent. If it still fails, give the user that command, wait for them to commit, then continue.

### 6. Triage drift

```sh
node scripts/v2-drift/drift.mjs --to origin/main
```

For each section:

- **Drift**: for every commit under a twin, run `git show <sha> -- <v1 files>` and decide:
  - A small behavioral change (a field, an API call, a permission check, a bug fix): port it to the V2 file listed for that twin, with a spec.
  - A larger change: add a row to BACKLOG section D (`ux-audit-2026-02-26-1426/BACKLOG-2026-10-10.md`) with an ID `D-NN`, the main commit, the V1 file → V2 file, a one-line change summary and status `open`.
  - Pure refactors, formatting and V1-only test churn: note them as "no V2 impact" in the report.
- **Routes added**: add the family or tab to `route-inventory.md` (Current UI `V1`, status `not_started`). New SSP or `/system` tabs also need a decision on whether they belong in `src/router/v2.ts`.
- **Routes removed**: make sure `src/router/v2.ts` no longer targets them.
- **Conflict watch**: if a main-owned file the branch still edits keeps conflicting, propose moving that branch change into an overlay.
- **Stale twins.json entries**: main moved or deleted a V1 file, or a V2 file moved. Fix `scripts/v2-drift/twins.json` and re-run.

If main added a V1 view or partial that a V2 view now needs to mirror, add it to `twins.json`.

### 7. Record and log

```sh
node scripts/v2-drift/drift.mjs --to origin/main --record
```

This step must come after the merge commit, because it records `HEAD` as the merge. Then append an entry to `ux-audit-2026-02-26-1426/execution-log.md`: the main SHA range, the commit count, conflicts and how they were resolved, drift items ported or logged, and routes added. Commit the follow-ups (ports, backlog, inventory, log) in a separate commit, e.g. `chore(ui-v2): sync follow-ups for main <sha>`.

### 8. Report to the user

Keep it short:

- the synced range and commit count
- conflicts and their resolutions
- drift ported vs logged (with D-IDs)
- new routes
- check results
- anything that needs the user's decision

## Optional: smoke test

If the local stack is running (API on :8080, `VITE_API_URL=http://localhost:8080 npm run dev` on :3000; setup in `ux-audit-2026-02-26-1426/seed-data.md`), load the pages behind any drift you ported and confirm they render with no console errors.
