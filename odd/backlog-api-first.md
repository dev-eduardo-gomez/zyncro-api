# Cobrix backlog: API-first consolidation proposal (2026-10-28)

**Applied on GitHub on 2026-10-28.** The NEW contract issue is #43. V1 open: #43, #22, #21, #5, #35, #6, #8, #9, #7, #10, #12. V2 open: #23, #27, #29, #31, #33, #41. Build order: #43 → #22 → #21 → #5 → #35 → #6 → #8 → #9 → #7 → #10 → #12. #22 moved ahead of #21 because user changes are audited.

**Scope reduction (2026-11-02):** the product pivots to a Cobrix-like collections/AR platform, not a full ERP, and CFDI/PAC/SAT fiscal compliance is deferred for V1 (see "Scope reduction" section below). Closed as not planned: #6, #31, #33, #41. Deferred to V2: #35 (now `[V2] Emitir y cancelar facturas CFDI 4.0`). V1 open is now: #43, #22, #21, #5, #8, #9, #7, #10, #12. Build order: #43 → #22 → #21 → #5 → #8 → #9 → #7 → #10 → #12.

## Criteria
1. **Source of scope:** the original spec (`docs/documentacion-general.md.md` §3) plus the legal and fiscal obligations (CFDI 4.0, auditing). Issues that came only from the Pencil views are dropped, because the UX/views work was abandoned on 2026-10-28.
2. **Fewer issues:** when two issues change the same aggregate or endpoint, they merge. A large issue is delivered in chained PRs, never split into more issues.
3. **V1 = legal and operational core.** Anything that depends on outside providers or that only adds analytics goes to V2.
4. **Every issue follows contract → review → tests → code.**

## Result: 34 open → 11 in V1 + 6 in V2 (17 closed)

### Versión 1 (build order)
| # | Title (new) | Absorbs | Key scope |
|---|---|---|---|
| NEW | Contrato OpenAPI como fuente de verdad | — | `contracts/openapi.yaml`, contract lint, contract tests, drop `GET /` (draft: `odd/issue-drafts/api-contract-foundation.md`) |
| #21 | Administrar usuarios | — (reduced) | ADMIN creates, deactivates, and changes the role of users (fixed roles MAKER/CHECKER/ADMIN). Out: custom roles, permission matrix, MFA, view projection |
| #22 | Bitácora de auditoría inmutable | — | Hash-chained append-only events written in the same transaction as the audited action, integrity check, query by module/actor. Dependency changes #21 → #4 |
| #5 | Clientes, facturas y pagos | #18, #19, #20 | Customer with generic tax id/legal name/address/credit days (no CFDI-specific fields); invoice with line items → subtotal/tax/total, unique folio, statuses (incl. derived PARTIAL/DUE_SOON, DISPUTED); payments; filtered list with cursor pagination. Out: contacts, segments, credit line/lock, saved views, CSV, batch actions, fiscal stamping |
| #8 | Recordatorios de vencimiento | #42 | Nightly sweep T-5…T+7 by email (BullMQ) + `POST` on-demand run (202 + job id, mutual exclusion, idempotent). WhatsApp stays in V2 (#27) |
| #9 | Conciliación con OCR y revisión humana | #28, #40 (OCR) | Vision port (Zod schema) reused for client payment proofs and supplier invoices; human review queue below the confidence threshold; manual correction audited (#22) |
| #7 | Throttling con Redis | — | Unchanged scope, new format |
| #10 | Contenedor, Nginx y Cloudflare | #11 | Multi-stage image, Nginx with security headers, Cloudflare proxy/WAF/Full (Strict) |
| #12 | CI/CD | #13 | Lint + contract lint + tests + build gate, image by SHA, migrations inside the container; absorbs the deterministic infra tests and the `${VAR:?}` guards from #13 |

### Versión 2
| # | Title | Absorbs | Note |
|---|---|---|---|
| #23 | Portal de pago con Magic Link y webhooks | #24 | In the original spec, but depends on Stripe/STP contracts |
| #27 | Recordatorios por WhatsApp | — | Spec channel; depends on Meta Business approval. Adapter on #8's port |
| #29 | Métricas e indicadores | #37 | DSO, MRR/ARR, % automation, cash flow, aging (company and per customer) as read endpoints |
| #35 | [V2] Emitir y cancelar facturas CFDI 4.0 | #34 | Deferred (2026-11-02): no fiscal stamping for V1. Singleton issuer profile, stamping through a PAC port with a sandbox adapter, untouched XML + PDF, SAT status check, cancellation with SAT reason code |
| #44 | [V2] Bank statements via open banking | — | New (2026-11-02). `BankStatementProvider` port, Belvo adapter by default (MX/BR/CO coverage, no Venezuela); feeds #9's reconciliation |
| #45 | [V2] Collections risk score | — | New (2026-11-02). `CollectionsRiskScorer` port, rule-based adapter (no ML yet); extends #5/#8/#29 |

### Closed as "not planned" (UI-only, not in the spec, no legal need)
#25 notifications over WebSocket · #26 collections desk · #30 global search · #32 budgets · #36 early-payment discount · #38 risk score · #39 cash payments / direct debit retry

### Closed as "not planned" (out of scope: accounts payable / suppliers / payroll, 2026-11-02)
#6 egresos con maker-checker · #31 expediente y evaluación de proveedores · #33 nómina · #41 auditoría trilateral de egresos

### Closed as merged
#11→#10 · #13→#12 · #18, #19, #20→#5 · #24→#23 · #28→#9 · #34→#35 · #37→#29 · #40→#6/#9 · #42→#8

## Legal flags (to resolve in each issue's contract)
- **#5 overpayment rule** (open since Phase 1): it must be stated in the contract before any code is written.
- CFDI/PAC/SAT-specific flags (payment complement REP 2.0, SAT cancellation reason codes) are retired for V1 — they only apply inside #35, which is deferred to V2.

## New issue template
```
## Problema
## Alcance            — endpoints as `METHOD /path` (operationId)
## Fuera de alcance
## Reglas de negocio  — R1..Rn; legal ones flagged ⚖️
## Contrato           — operationIds in contracts/openapi.yaml (designed in the issue's Phase 0, reviewed before tests)
## Criterios de aceptación
## Reparto
   - Claude: contract, RED tests (unit + e2e + contract), domain models, ports, Prisma schema, docs
   - Usuario: use case logic, adapters, infrastructure, running migrations/generate, commits
## Guía paso a paso   — what, where, guiding questions, done criteria; never the solution
## Aprendizaje
## Dependencias
```

## Apply plan (after approval)
1. Rewrite the 11 V1 and 6 V2 bodies with the template (the contract section says "pendiente: se diseña al iniciar" until each issue starts).
2. Close the 17 issues with a comment explaining why (merged into #X / not planned).
3. Create the NEW contract issue in milestone "Versión 1"; move #23, #27, #29, #41 to "Versión 2" with the `[V2]` prefix.

## Scope reduction (2026-11-02)

User decision, after analyzing cobrix.co as the product reference: the product narrows to a Cobrix-like adaptable collections/AR platform for a single issuing company (no multi-tenant, confirmed), not a full ERP, and fiscal/tax-authority compliance is out of scope for V1.

1. **Closed as not planned** (accounts payable / suppliers / payroll — never part of Cobrix's feature set): #6, #31, #33, #41.
2. **Deferred to V2**, not closed: #35 (`[V2] Emitir y cancelar facturas CFDI 4.0`). Reason given by the user: stamping (CFDI or any tax authority) requires contracting and vetting a certification provider (PAC or equivalent), which is a real investment they don't want to make yet. Revisit once a target market/country is chosen.
3. **#5 edited**: dropped CFDI-only fields (RFC-specific tax regime, fiscal ZIP, default CFDI use) in favor of a generic `taxId`/address; dropped the REP 2.0 payment-complement rule (R7); invoices are internal documents for V1, not fiscally stamped.
4. Adaptability principle (see conversation, not yet written into an issue): when bank/payment-provider integrations are designed (#9, #23 V2, #41 was the trilateral case but is now closed), the bank/PSP must sit behind a generic port with swappable adapters — never hardcoded to one country's banks, unlike cobrix.co's Venezuela-only bank list. Apply this when #9's contract is designed.
