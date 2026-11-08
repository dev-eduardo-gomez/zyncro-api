# Issue #3 — Problem Details (RFC 9457) for API errors

Objective: one stable error contract (`application/problem+json`) for every API error. Branch: `feat/3-problem-details` (from `dev`, PR targets `dev`). Delivery: `ask-on-risk`. Runner: Vitest (`npm test`, `npm run test:e2e`). Mode: guided-scaffold until L14; implemented end to end by the assistant from L14. Architecture: hexagonal.

## Specs

- S1 — "Filtro global de excepciones que responde `application/problem+json` según RFC 9457 (sucesor de RFC 7807): `type`, `title`, `status`, `detail`, `instance`, más la extensión `timestamp`."
- S2 — "Tipo de excepción de regla de negocio con `type` URI propio (por ejemplo `https://cobrix.io/errors/business-rule/maker-checker-violation`)." Design decision (user, 2026-10-14): the domain exception carries only a code; the HTTP adapter translates code → `type` URI, `status`, `title`. Unmapped codes fall back to a generic business-rule status (pinned by a test).
- S3 — "Mapeo de errores de validación, recurso inexistente y errores desconocidos."
- S4 — "Errores de validación, 404 y de regla de negocio devuelven Problem Details con `Content-Type: application/problem+json`."
- S5 — "Un error inesperado devuelve 500 sin exponer stack trace ni mensajes internos, y queda registrado en el log."
- S6 — "`type` es una URI simple, nunca texto con formato Markdown."
- Out of scope (verbatim): "Envelope de respuestas exitosas (`{ status, data }`)"; "Autenticación (ver #4)."

## Tasks

Forecast: ~350 authored changed lines (excluding lockfile) -> under the ~400 budget, single PR.

- [x] T1 — S2, S6: `BusinessRuleViolation` domain error with a validated kebab-case `code` (constructor invariant). Route: inline (guided). Unit test. RED 15 failed / 5 passed -> GREEN 20/20. Commit `d85392f`.
- [x] T2 — S2, S6: HTTP translation of business-rule codes (`type` URI derived from code, status/title table, fallback for unmapped codes). Route: inline (guided). Unit test. RED "Not implemented" -> GREEN 5/5. Commit `1348656`.
- [x] T3 — S1, S3, S5: `ProblemDetailsFilter` for `HttpException`, business rules and unknown errors (500, generic detail, logged). Route: inline (guided). Filter spec with a stub controller. RED (filter missing) -> GREEN 7/7. Commit `338eca7`.
- [x] T4 — S3, S4: validation errors (`class-validator` + `ValidationPipe` `exceptionFactory` -> `RequestValidationException` -> `errors` extension). Route: inline (guided). Unit + filter spec. RED 4 failed -> GREEN. Commit `c039ed6` (includes class-validator deps).
- [x] T5 — S1, S4: global registration in `CoreModule` (`APP_FILTER`, `APP_PIPE`) + e2e (404 and content type on the real app). Route: inline (guided). RED 4 failed -> GREEN e2e 6/6. Commit `a543d52`.

## Log

- L1 (2026-10-14, user request verbatim): "el 3" (start issue #3 after PR #15 was opened).
- L2: architecture style confirmed (verbatim: "hexagonal").
- L3: Phase 1 delivered (summary, data flow, pseudocode, edge cases: non-Error throws, leaks in 500 detail, multi-field validation errors, malformed `type`). Docs inconsistency noted: `docs/backend-infra.md.md` says "Interceptor RFC 7807", `docs/fases-implementacion.md.md` says `GlobalExceptionFilter`; filter chosen (issue wording).
- L4: user asked for a recommendation; recommended domain code + adapter translation (dependency rule; #8 queue adapter reuses domain errors). User decision (verbatim): "Si".
- L5: `main` has no validation library (no `class-validator`/`zod`); S3 validation mapping needs one. Open gate.
- L6: user chose (verbatim): "class-validator + validationpipe ya es un estanda de NestJS". Verified in NestJS docs: Nest 12 ships both `ValidationPipe` (class-validator) and `StandardSchemaValidationPipe`; both expose `exceptionFactory`. Gates closed; Phase 2 delivered.
- L7: git flow decided (verbatim: "si, features hacia dev y dev hacia main"). `dev` was at the initial commit, 21 behind `main`; user fast-forwards it. Branch now starts from `dev`.
- L8 (2026-10-15): `dev` verified in sync with `main` (0/0). Default branch still `main`; user agreed to switch it to `dev` (`gh repo edit --default-branch dev`), not yet verified. Paused at the user's request ("dejemoslo hasta aqui"). Next: verify default branch, user creates `feat/3-problem-details` from `dev`, installs `class-validator class-transformer`, writes T1 RED in `src/shared/domain/errors/business-rule-violation.spec.ts`.
- L9 (2026-10-15, resume "retoma donde nos quedamos"): verified default branch = `dev`; `feat/3-problem-details` sits on `dev` (9aa36b4); `class-validator ^0.15.1` + `class-transformer ^0.5.1` installed (uncommitted). T1 RED not started.
- L10 (2026-10-15): Phase 2 scaffold re-delivered on request (reconstructed from L4-L6; original text was not stored): tree `src/core/core.module.ts`, `src/shared/domain/errors/`, `src/shared/infrastructure/http/problem-details/` (problem-details.ts, business-rule-problem-catalog.ts, problem-details.filter.ts, request-validation.exception.ts, validation-exception.factory.ts) with `it.todo` stubs. T1 invalid-code cases proposed by the user (verbatim): "mayúsculas, espacios, guiones al inicio o final y vacío". Hinted gaps: consecutive hyphens and the character alphabet (URI/Markdown special chars, S6); taught `it.each`. Dependencies belong to the T4 commit. Paused ("dejemoslo hasta aqui, seguimos despues") with the question pending: which cases to add.
- L11 (2026-10-21, resume "retoma donde nos quedamos"): state unchanged since L10: `business-rule-violation.spec.ts` empty (T1 RED not written); `business-rule-violation.ts` has an abstract class with no code validation. Re-asked the pending L10 question.
- L12 (2026-10-21, user verbatim): "vamos a hacer una cosa. Crea tu los TDD cada vez que hagamos una funcionalidad o algo nuevo de la issues que implique usar TDD y asi agilizar mejor todo. Porque deseo ya empezar con el flujo de trabajo de desarrollo". From now on the assistant writes each task's RED spec; the user implements GREEN.
- L13 (2026-10-21): T1 RED written in `src/shared/domain/errors/business-rule-violation.spec.ts`: valid codes (`overdue`, `credit-limit-exceeded`, `rule-2fa`), 15 invalid codes (empty, uppercase, spaces, leading/trailing/consecutive hyphens, `_ / ? #`, Markdown `* \` []()`, accented letters). Error contract chosen: throws with message `Business rule code must be kebab-case, got "<code>"`. Observed: 15 failed (no throw) / 5 passed.
- L14 (2026-10-21, user verbatim): "haz todo la issues completa #3 sobre la estandarizacion". Implementation mode: assistant implements T1-T5 inline (no writer trigger) with RED-first specs and work-unit commits.
- L15 (2026-10-21): decisions taken while implementing: `maker-checker-violation` -> 403 (segregation of duties), fallback 422 `Business rule violated`; `about:blank` + status phrase for HttpExceptions; 5xx HttpExceptions also hide their message and are logged; validation type `https://cobrix.io/errors/validation`, `errors[]` entries `{ field, detail }` with dotted paths (no JSON Pointer: the pipe also validates query/params); `ValidationPipe` only gets `exceptionFactory` (`whitelist`/`transform` deferred to the first DTOs); filter uses `HttpAdapterHost` (platform-agnostic); catalog lookup uses `Object.hasOwn`.
- L16 (2026-10-21): verification: unit 53/53, e2e 6/6, oxlint clean, `nest build` ok. `tsc --noEmit` reports only the pre-existing `supertest/types` error in `test/app.e2e-spec.ts` (baseline). `test:int` not run (Prisma untouched). RDD assess (base 9aa36b4, committed-only, untracked excluded): risk medium (lockfile), review_due false (`under_budget`), 800 changed lines (760 without lockfile, mostly tests) vs ~350 forecast. Docs: guide `docs/learning/09-problem-details-rfc-9457.md`; `backend-infra` and `fases-implementacion` now say RFC 9457 filter; commit `e4edc00`. Next: user decides push + PR to `dev` (Closes #3).
- L17 (2026-10-21, user verbatim): "haz el commit y push y crea el PR para cerrar la issues 3". Nothing left to commit (odd/ and tsbuildinfo stay untracked). Pushed `feat/3-problem-details`; opened PR #16 -> `dev` (Closes #3, label `enhancement`).
