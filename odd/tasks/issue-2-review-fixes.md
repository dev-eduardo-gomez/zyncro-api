# Issue #2 — Review fixes before the PR

## Objective

Address the non-blocking findings from branch review `review-af9898f25ceb07d0` (base `a32b220`, up to `f4d8424`) before opening the PR that closes #2.

## Problem / why

The branch works locally, but it is fragile outside a developer machine (clean clone, CI, containers) and the decimal precision test does not prove what its name claims.

## Scope

- In: the five findings below, with tests alongside the behavior.
- Out: `/health` endpoint and `app.enableShutdownHooks()` (new follow-up issue); `supertest/types` tsc error (issue #13).

## Constraints

- Guided TDD: the user writes code and tests; the assistant explains and verifies.
- TDD mode: strict (session config). Runner: Vitest (`npm test`, `npm run test:int`, `npm run test:e2e`).
- Integration tests need Docker Desktop and the `postgres` service up.
- Commit: `fix(prisma): ...` / `test(prisma): ...`, Conventional Commits, made by the user.

## Tasks

- [x] T1 — Discriminating decimal test: DB-side sum without float drift, rounding beyond 2 decimals, max value roundtrip, rejection beyond 13 integer digits. Route: inline (guided, 1 file).
- [x] T2 — The integration setup fails fast with a single clear error when Postgres is unavailable (verify connectivity in `beforeAll`; guard `afterAll` cleanup so it does not add a second error). Route: inline (same file as T1). Redefined 2026-10-09, see progress.
- [x] T3 — Guard `process.loadEnvFile()` with `existsSync` in `prisma.config.ts` and the integration spec. Route: inline (guided). Commit `cfe3185`.
- [x] T4 — Validate `DATABASE_URL` in `PrismaService` (fail fast with a clear message), unit-tested. Route: inline (guided). Commit `98bc649`.
- [-] T5 — Run `prisma generate` automatically (`postinstall`) so a clean clone builds and tests. Route: inline (mechanical). DEFERRED to #13 (user decision 2026-10-14).

## Acceptance criteria

- `npm test`, `npm run test:int` and `npm run test:e2e` green.
- `npx tsc --noEmit` without new errors.
- Each new test shown to fail when the behavior it guards is broken.

## Progress / evidence

- T1 (in progress): DB-side sum test written (`createMany` 10 × '0.10' + `aggregate _sum`, asserts `toString() === '1'`). Discrimination proven: expected '0.9999999999999999' failed with `Received: "1"`. `npm run test:int` 3/3 green. Removed an assertion-less test. Learning guide: `docs/learning/05-decimal-precision-tests.md`.
- T1 (in progress): rounding test written (`'10.005'` → `'10.01'`, half away from zero; discriminates against half-even and truncation). Discrimination proven: expected '10' failed with `Received: "10.01"`. `npm run test:int` 4/4 green (2026-10-09).
- T1 (in progress): max value roundtrip test written (`'9999999999999.99'`, 13 integer digits). RED reported by the user (expected `'9999999999999.98'`), not observed by the assistant. GREEN observed: `npm run test:int` 5/5 (2026-10-09).
- T1 (in progress): overflow test at the boundary (`'1'.padEnd(14, '0')`, 14 integer digits) asserts `rejects.toMatchObject({ code: 'P2020' })`. RED observed as the real error (`PrismaClientKnownRequestError`, "Value out of range for the type: numeric field overflow"); `ValueOutOfRange` → `P2020` confirmed in the Prisma 7.10 runtime. A first version used 15 digits (not the boundary) and was corrected.
- T1 (in progress): removed the non-discriminating `0.1 + 0.2` test (sum computed by decimal.js before the DB; `toFixed(2)` masked drift) and the unused `Prisma` import.
- T1 checks observed (2026-10-09): `npm run test:int` 5/5, `npm test` 15/15, `npm run lint` clean, `npx tsc --noEmit` only the known `supertest/types` error (#13). Pending: user commit.
- T1 committed by the user as `4c7135c` (subject uses `feat(prisma)`; `test(prisma)` was planned, amend proposed since the branch is not pushed). RDD assessment (`--base-ref f4d8424 --committed-only`, untracked `odd/` excluded): risk `medium` (`executable_change`), 105 changed lines, `review_due: false` / `under_budget`. Reviewed boundary stays at `f4d8424`; the slice remains pending.

- T1 done: amended to `45e1838 test(prisma): make decimal precision tests discriminating` (replaces `4c7135c`).

- T2 premise revised (user accepted): with Postgres stopped, `beforeAll` did NOT fail. `$connect()` with the `pg` driver adapter only builds a pool; no real connection until the first query. Observed report: 6 errors with the same cause (`Can't reach database server at 127.0.0.1:15432`), 5 tests + 1 suite-level error from `afterAll` `deleteMany` (line 20), shown first. The original finding ("afterAll masks a beforeAll failure") only becomes real once `beforeAll` fails fast. This report is the RED for T2.

- T2 step 1: replaced `$connect()` with `$queryRaw`SELECT 1`` in `beforeAll`. Observed (Postgres stopped): first error at `SELECT 1`, 5 tests skipped, but `afterAll` `deleteMany` still added a second error (original finding now reproduced; RED for step 2).
- T2 step 2: `isDatabaseReady` flag set after `SELECT 1`; `afterAll` cleans up only when ready, inside `try/finally` with `prisma?.$disconnect()`. Observed (Postgres stopped): exactly one error (`SELECT 1`, line 17), 5 skipped.
- T2 checks observed (2026-10-09, Postgres up): `npm run test:int` 5/5, `npm test` 15/15, `npm run lint` clean, `npx tsc --noEmit` only #13, 0 leftover `TEST-%` customers after the run. Learning guide: `docs/learning/06-integration-test-lifecycle-guards.md` (05 extended with the rest of T1). Pending: user commit.

- T2 done: committed by the user as `f4b4ea6 test(prisma): fail fast when the integration database is unreachable`. RDD assessment (`--base-ref f4d8424 --committed-only`, `odd/` excluded): risk `medium` (`executable_change`), 127 changed lines across T1+T2, `review_due: false` / `under_budget`. Reviewed boundary stays at `f4d8424`.
- Paused 2026-10-10 at the user's request. User was advised to read section 0 of guide 06 before T3.

- T3 premise verified (2026-10-10): `process.loadEnvFile()` throws when `.env` is missing even if `DATABASE_URL` is already set (Node v24.19.0). Prisma's `env()` already throws `PrismaConfigEnvError` for a missing variable, so `prisma.config.ts` needs only the file guard; the `PrismaService` gap is T4.
- T3 RED (pasted by the user): with `.env` renamed and `DATABASE_URL` exported, `npx prisma validate` -> `Failed to load config file ... ENOENT: no such file or directory, open '.env'`. `.env` is kept as `.env.bak` until GREEN is observed.
- T3 GREEN in `prisma.config.ts` (user wrote `if (existsSync('.env')) process.loadEnvFile();`): `npx prisma validate` -> schema valid (pasted by the user). Without `.env` and without `DATABASE_URL`, observed `PrismaConfigEnvError: Cannot resolve environment variable: DATABASE_URL.` (clear error preserved). Pending: the same guard in the integration spec.
- Paused 2026-10-10 at the user's request, before the integration-spec RED. `prisma.config.ts` change is uncommitted. At pause time `.env` was still renamed to `.env.bak` (user told to restore it). Note: the dummy `DATABASE_URL` used for `prisma validate` cannot connect; the spec RED/GREEN needs the real URL from `.env`.

- 2026-10-13: `.env` confirmed restored (no `.env.bak`). The spec guard (`if (existsSync('.env')) process.loadEnvFile();`, line 6, plus `node:fs` import) is already in the working tree but its RED was never observed. Docker Desktop daemon was down. User correction (verbatim): "recuerda que eres mi mentor sobre /guided-scaffold. No requiero hacer predicciones [...] haz estado dando soluciones, dejando de lado el enfasis de aprender en la marcha mediante explicaciones teoricas, practicas, sin soluciones." Taught: module-load vs test-run execution, file-read precondition vs variable precondition, controlled sabotage. Exercise handed out (not yet run). Paused at the user's request.

- 2026-10-13 (later): verified on disk that `.env` does NOT exist and `.env.bak` does (the earlier "restored" note was wrong or the file was renamed again). This is already the sabotage precondition; restore only at the end of the exercise.
- 2026-10-13: user chose to run both sabotage runs with Docker STOPPED (verbatim: "con el docker apagado, para ver los logs posible y comprender"). Comparison is by error type and stage, not pass/fail.
- T3 spec RED observed (pasted by the user, Docker stopped, no `.env`): bare `process.loadEnvFile()` -> `Error: ENOENT: no such file or directory, open '.env'` at spec line 6:9, `(0 test)`, `Tests no tests` (failure at module import, no tests registered).
- T3 spec with guard (same conditions): module imported, 5 tests registered and skipped; suite-level failure in `beforeAll` with `Error: SASL: SCRAM-SERVER-FIRST-MESSAGE: client password must be a string` (pg-pool), NOT the T2 connectivity error (`Can't reach database server`). Open question: whether `DATABASE_URL` was set in that terminal and what answered the auth handshake. User investigating.
- User confirmed (verbatim): "no, no existe la variable. Se paso copiarla y ejecutar con los test". Both runs lacked `DATABASE_URL`, so the planned condition (no `.env` + variable exported) was not met. Guard effect on module import is still shown; the CI-like scenario is not. The SASL error is a live example of the T4 gap (undefined connection string -> pg defaults -> confusing auth error). Recommended: repeat both runs with the variable exported.
- T3 spec sabotage repeated with the planned conditions (no `.env`, `DATABASE_URL` exported, Docker stopped; pasted by the user 2026-10-13): without guard -> `ENOENT ... open '.env'` at line 6:9, `(0 test)`, `Tests no tests` (RED: fails even though the variable is set). With guard -> 5 tests registered and skipped, single suite-level error at line 18 `SELECT 1`: `Can't reach database server at 127.0.0.1:15432` (URL taken from the environment, T2 fail-fast intact). Spec guard proven. Pending: restore `.env`, start Docker, full checks, user commit.
- T3 checks observed (2026-10-13, pasted by the user, Docker up, `.env` restored and verified on disk): `npm test` 15/15, `npm run test:int` 5/5, `npm run test:e2e` 1/1, `npm run lint` 0 warnings/0 errors, `npx tsc --noEmit` only the known `supertest/types` error (#13). Diff: 2 files, +4/-2. Observation out of scope: e2e printed `ERROR [ObserveAgentWorker] Worker stopped with exit code 1. Restarting worker...`; the name does not appear in the project sources (not investigated). Pending: user commit.

- T3 done: committed by the user as `cfe3185 fix(prisma): skip loading .env when the file is missing` (2 files, +4/-2). RDD assessment (`--base-ref f4d8424 --committed-only`, `odd/` excluded): risk `medium` (`executable_change`, `prisma.config.ts`), 133 changed lines across T1-T3, `review_due: false` / `under_budget`. Reviewed boundary stays at `f4d8424`.
- 2026-10-13 user instruction (verbatim): "antes de seguir con lo demas, recuerda hacer un md de retroalimentacion en cada fase terminada". T3 guide written: `docs/learning/07-env-file-guard-and-controlled-sabotage.md` (includes "Retroalimentación de la fase"). Applies to T4 and T5 too.
- T4 design (2026-10-14): user first proposed `onModuleInit`; taught construction invariant + evidence that `prisma.module.spec.ts` only calls `compile()` (constructor runs, `onModuleInit` never does). User decision (verbatim): "el constructor ya me lo aclaraste". Validation goes in the `PrismaService` constructor. Verified: Vitest 4.1.11 `vi.stubEnv` accepts `string | undefined`. Next: user writes the RED unit test in `prisma.service.spec.ts`.
- T4 scope: user first used `vi.stubEnv('DATABASE_URL', '')` (empty, not missing); taught missing (`undefined`) vs empty (`''`). User chose `undefined` (missing only); empty-string case is not covered by T4.
- T4 RED observed (pasted by the user 2026-10-14): test `rejects a missing DATABASE_URL` -> `AssertionError: expected [Function] to throw an error` at spec line 34 (`toThrow('DATABASE_URL is not set')`). Failed for the right reason (constructor does not throw). Other tests green: 1 failed | 15 passed (16).
- T4 GREEN (pasted by the user 2026-10-14): constructor guard before `super` (`if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL is not set');`), `npm test` 16/16. Assistant spot check: diff 2 files +7, `npx tsc --noEmit` only #13. Note: falsy check also rejects `''`, which no test pins (behavior wider than tests). Open: user decides whether to add the empty-string test.
- T4 scope extended (user decision, verbatim: "agregar el test"): add a unit test pinning that an empty `DATABASE_URL` is rejected. Behavior already exists, so discrimination must be shown by controlled sabotage (temporarily narrowing the condition to `=== undefined`).
- T4 empty test (`rejects an empty DATABASE_URL`, `vi.stubEnv('DATABASE_URL', '')`, expects `toThrow('DATABASE_URL it is empty')`). Sabotage (`=== undefined`, pasted by the user): missing test green, empty test `expected [Function] to throw an error` (test discriminates). Restored `!`: empty test fails with `expected [Function] to throw error including 'DATABASE_URL it is empty' but got 'DATABASE_URL is not set'` — the test expects a distinct message the code does not produce. Open: user decides same message vs distinct message for empty (also: "it is empty" is ungrammatical).
- T4 decision (verbatim: "asi con is empty esta bien"): empty `DATABASE_URL` gets its own message `DATABASE_URL is empty`; missing keeps `DATABASE_URL is not set`. Next: fix the test string, observe the RED (wrong message), then distinguish both cases in the constructor.
- T4 GREEN (pasted by the user 2026-10-14): constructor with two strict guards before `super` (`=== undefined` -> `DATABASE_URL is not set`; `=== ''` -> `DATABASE_URL is empty`); `npm test` 17/17. RED with the corrected string (`'DATABASE_URL is empty'`) was NOT pasted; the closest observed evidence is the earlier wrong-message failure (`got 'DATABASE_URL is not set'`) with the misspelled expectation. Pending: full checks, feedback guide 08, user commit.
- T4 full checks (pasted by the user 2026-10-14): `npm run test:int` 5/5, lint clean, tsc only #13, but `npm run test:e2e` FAILS (change-caused): `Error: DATABASE_URL is not set` at `prisma.service.ts:12` during `TestingInjector.instantiateClass`, plus a second error `TypeError: Cannot read properties of undefined (reading 'close')` at `test/app.e2e-spec.ts:27` (`afterEach` teardown without guard, pre-existing since `2cd8005`, same pattern as T2).
- Root cause (code inspection): nothing loads `.env` for the e2e suite (`vitest.config.e2e.ts`, `test/app.e2e-spec.ts`) nor for the app runtime (`src/main.ts`, `nest start`). Before T4 the app booted with `connectionString: undefined` silently (lazy pool, no route queries the DB). T4's fail fast exposed the hidden misconfiguration. Hypothesis to verify by the user: `npm run start:dev` without an exported `DATABASE_URL` now fails at boot.
- Correction: `ObserveAgentWorker` comes from `@nestjs/observe`, registered in `src/app.module.ts` (`ObserveModule.forRoot` with placeholder `YOUR_APP_KEY`/`YOUR_APP_SECRET`). The earlier note "not in project sources" was incomplete (the class name lives in node_modules; the module is in the app).
- Blocker for the T4 commit: e2e must be green. Open design decision for the user: how the e2e suite (and possibly the app) obtain `DATABASE_URL`.
- Hypothesis confirmed (pasted by the user 2026-10-14): `npm run start:dev` without exported `DATABASE_URL` -> `ERROR [ExceptionHandler] Error: DATABASE_URL is not set at new PrismaService (prisma.service.ts:12:13)` during `Injector.instantiateClass`. The real app cannot boot from `.env` today.
- T4 env-loading decision (verbatim: "la opcion A"): reuse the T3 guard (`if (existsSync('.env')) process.loadEnvFile();`) in `src/main.ts` and `test/app.e2e-spec.ts`. Rejected for now: Vitest `setupFiles` (pattern inconsistent with the int spec) and `@nestjs/config` (new dependency; candidate follow-up issue to centralize config). RED evidence for this step: the failing e2e and `start:dev` outputs above.
- T4 env-loading GREEN (partial): user placed the guard inside `bootstrap()` in `src/main.ts` and inside `beforeEach` in `test/app.e2e-spec.ts` (verified via `git diff`). `npm run start:dev` without exported `DATABASE_URL` -> `Nest application successfully started` (pasted by the user). e2e output not yet pasted. Out of scope: `ERROR [ObserveAgentWorker] Telemetry rejected (401)` from `@nestjs/observe` placeholder credentials in `src/app.module.ts` (candidate follow-up issue). Design note raised: env loading inside `beforeEach` runs per test; suite-wide config fits module level or `beforeAll` (consistent with the int spec).

- Paused 2026-10-14 at the user's request ("guarda hasta aqui, para retomarlo despues"). Nothing committed for T4. Uncommitted: `prisma.service.ts` (two strict guards), `prisma.service.spec.ts` (missing + empty tests), `src/main.ts` and `test/app.e2e-spec.ts` (env guard).

- T4 env-loading GREEN (pasted by the user 2026-10-14, Docker up): `npm run test:e2e` 1/1 (`/ (GET)`) with the guard inside `beforeEach`. Only the known out-of-scope `ObserveAgentWorker` log. Step (1) closed.
- T4 decision (verbatim: "seria a nivel modulo para precargar el archivo, antes de registrar cualquier test. Dejando el entorno de pruebas preparado"): move the e2e env guard from `beforeEach` to module level, consistent with the int spec. Step (2) decided; user applies it and reruns e2e.
- T4 step (2) done (pasted by the user 2026-10-14, verified via `git diff`): guard at module level after the imports; `npm run test:e2e` 1/1. User explained correctly why import hoisting is harmless here (verbatim: "se lee al instanciar, en el constructor de PrismaService"). Next: step (3), `afterEach` teardown guard.
- T4 scope extended (user decision, verbatim: "lo corrijo ahora"): add the `afterEach` teardown guard in `test/app.e2e-spec.ts` (pre-existing since `2cd8005`, T2 pattern). RED/GREEN via controlled sabotage (no `.env`, no exported `DATABASE_URL`).
- T4 step (3) attempt 1 (pasted by the user 2026-10-14): user chose optional access (verbatim: "el acceso opcional, porque solo necesito saber si app existe") but wrote `if (!app) throw new Error('Initialization failed')` in `afterEach` plus `moduleFixture?.createNestApplication()` in `beforeEach`. Sabotage run still reports 2 errors (`DATABASE_URL is not set` + `Initialization failed`): noise replaced, not removed. RED without the guard was not pasted. `.env` presumably still renamed to `.env.bak`.
- T4 step (3) attempt 2 (pasted by the user 2026-10-14): `afterEach` -> `await app?.close();`; `moduleFixture?.` removed but `await app?.init();` added (same dead-guard pattern: `app` was just assigned). Sabotage run: exactly one error (`DATABASE_URL is not set`, `[1/1]`) — GREEN for the teardown guard. RED without any guard still not pasted (the only unguarded evidence is the earlier T4 e2e failure with the `reading 'close'` TypeError).
- T4 step (3) RED/GREEN observed under the same conditions (pasted by the user 2026-10-14, no `.env`, no `DATABASE_URL`): with `app?.close()` -> 1 error `[1/1]` (`DATABASE_URL is not set`); without guard -> 2 errors `[1/2]` + `[2/2] TypeError: Cannot read properties of undefined (reading 'close')` at spec line 30. Teardown guard proven. Disk check right after: working tree is in the RED state (bare `app.close()`, `app?.init()` gone), `.env` still renamed to `.env.bak`. Pending: user restores the guard and `.env`.
- T4 full checks (pasted by the user 2026-10-14, Docker up; disk verified: `app?.close()` restored, `.env` present): `npm test` 17/17, `npm run test:int` 5/5, `npm run test:e2e` 1/1, lint 0/0, tsc only #13. Diff: 4 files, +23/-1. Steps (3)-(4) done. Guide written: `docs/learning/08-database-url-fail-fast.md` (step 5). Pending: user commit (step 6).

- T4 done: committed by the user as `98bc649 fix(prisma): reject a missing or empty DATABASE_URL at startup` (4 files, +23/-1; body explains .env loading and the afterEach guard). RDD assessment (`--base-ref f4d8424 --committed-only`, untracked excluded): risk `medium` (`executable_change`), 157 changed lines across T1-T4, `review_due: false` / `under_budget`. Reviewed boundary stays at `f4d8424`.

- T5 intro (2026-10-14): verified `prisma/schema.prisma` outputs to `src/generated/prisma`, `.gitignore` excludes `/src/generated/`, no script runs `prisma generate`. Taught npm lifecycle hooks (`postinstall`, `pre<script>`). Open question to the user: how to reproduce a clean clone locally (which folder to remove temporarily, which commands) to observe the RED. Paused at the user's request ("deja eso para despues").

- 2026-10-14 user decision (verbatim: "dejalo aparte eso, prefiero seguir con lo demas de las issues" / "si"): T5 deferred to #13 (local config hardening). Issue #2 acceptance criteria verified as met on the branch (migration init_ar, NUMERIC(15,2) tests, unique taxId test, decimal integration test, PrismaService). Remaining: push `feat/2-prisma-ar-models` and open the PR closing #2 (user approval required). Note: `sync engram memories` commits are an existing repo convention (also on main, e.g. `ce2982d`).

- 2026-10-14: branch pushed; PR #15 opened (`enhancement`, closes #2, verified via `gh pr view`). T5 added to #13 as a comment (issuecomment-6182796148).

## Next step

PR #15 merge is the user's decision. Then pick the next issue.
