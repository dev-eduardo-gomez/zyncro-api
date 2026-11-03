# Cobrix design v1/v2 in Pencil + V2 issue backlog
Objective: new Pencil file with V1 views matching issues #1-#13 and V2 views from the original designs; derive V2 issues. File: `C:/Users/ofima/Developer/Pencil/ERP Cobrix v2.pen` (outside the repo).
Branch: none (design + GitHub issues only). Delivery: issues published only after user confirmation. Test runner: n/a (visual readback via screenshots).

## Specs
- S1: "toma los diseños como fuente y deriva las issues nuevas" — derive new issues from the Pencil designs (`ERP Cobrix v1.pen`).
- S2: "lo que tenemos actualmente en la API sea la version 1, en base a eso crea unas nuevas vistas que se ajusten a lo que tenemos definido en todas las issues" — V1 views show only what issues #1-#13 define.
- S3: "lo que se deriva como nuevas sea la version 2 con las demas vistas implementadas y ya definidas" — V2 = the remaining views, backed by the derived issues.
- S4: "quiero que hagas otra version de pencil, claro que mucho mejor visualmente pero sin sobre cargar las vistas" — a new Pencil file, visually better, without overloading views.
- S6: "si que esten al alcance de la version 1" — the V3 · 01–08 views are the V1 scope.
- S7: "con lo que acabas de hacer, completa las vistas de la version 1 que te dije V3" — add V3-style views for every V1 issue without a screen.
- Assumption: the new file holds both V1 and V2 sections; V1 frames prefixed `V1 ·`, V2 frames `V2 ·`.

## Tasks
- [x] T1 (S4) design tokens (`ds-*`, light) + reusable `DS · Sidebar V1` (p6iGPy) — inline
- [x] T2 (S2) 7 V1 frames at y=22170: 01 login (U9tIq), 02 clientes (Wf7IL), 03 cliente·facturas (I9Zfg), 03b emitir factura (Y067w2), 04 factura·pagos (xQcQD), 05 conciliación (zqcNr), 06 egresos (vxp2a) — inline, screenshots checked
- [x] T3 (S1, S3) 16 V2 issues published as #18–#33, title prefix `[V2]`, milestone "Versión 2" (#1), label enhancement — inline
- [-] T4 V2 views — superseded: user stopped the agent and designed V3 · 01–08 (L6)
- [x] T5 (S6) V1 rescoped to cover V3 views: milestone "Versión 1" (#2) holds #1–#13, moved #18–#29 and #32 (prefix [V2] removed), new #34–#41; V2 keeps #30, #31, #33 — inline
- [x] T7a (S7) V3 · 09–13 → f16chC, XSBlj, s5aFm, t7Yf2r, J9aZ0 (row y=23800, 1600×1100); Sidebar V3 +Cobranza, +SISTEMA group; parent spot check s5aFm OK — (nuevo cliente #5/#18, registrar pago #5, mesa de cobranza #26/#27/#42, conciliación de cobros #9/#28, registrar egreso #6/#40) + nav items in Sidebar V3 — delegated (context backstop)
- [x] T7b (S7) V3 · 14–18 → JbsoY, VkJ7z, bW3W1, sVW5f, isod1 (row y=23800); parent spot check sVW5f OK; open: screen 17 shows a CHECKER user with ADMIN-only edit — (notificaciones #25/#42, webhooks #24, usuarios y roles #21, empresa emisora #34, bitácora #22) — delegated after T7a
- [x] T6 (S6) "Ejecutar cobranza" published as #42 (on-demand run of #8 reminders), milestone "Versión 1" — inline

## Log
- L1 (2026-10-28, user verbatim): "toma los diseños como fuente y deriva las issues nuevas. Pero diriamos que primero que lo que tenemos actualmente en la API sea la version 1, en base a eso crea unas nuevas vistas que se ajusten a lo que tenemos definido en todas las issues. Y lo que se deriva como nuevas sea la version 2 con las demas vistas implementadas y ya definidas. En base a eso, quiero que hagas otra version de pencil, claro que mucho mejor visualmente pero sin sobre cargar las vistas"
- L3: Pencil MCP ignores filePath and writes to the active editor; probe landed in v1 and was deleted. v2 file is a disk copy of v1 (originals kept as reference); user opened it ("ya lo abrí, continúa").
- L4: V1 uses dueDate because #8 needs it; no folio or customer name (not in issues). Maker-checker 403 verified at src/shared/infrastructure/http/problem-details/business-rule-problem-catalog.ts:17.
- L5 (2026-10-28, user verbatim): "tal como estan, pero con normativo que sea de Version 2. Para diferencias de la primera version" — interpreted as V2 naming: `[V2]` title prefix + milestone "Versión 2".
- L6 (2026-10-28, user verbatim): "checa las vistas que acabo de hacer las que dicen V3 01 - 08. Esas vamos a usar. quiero que analices que de esas vistas que falta por implementar en la version 1 del backend" — user stopped the T4a agent; V3 · 01–08 (fqzEJ, lbhKe, eZFmJ, jfTNm, K16dje, u9mJU, KucjM, tuN07; components Sidebar V3 kWzFp, Topbar V3 ha0UD) replace T4. Gap analysis delivered; 9 backend gaps without any issue (CFDI 4.0 stamping, purchase orders + three-way match, expense capture with OCR, payment-risk score, per-customer analytics, extra payment methods, early-payment discount, "Ejecutar cobranza", issuer company profile).
- L7 (2026-10-28, user verbatim): "si que esten al alcance de la version 1". Moves follow direct need plus dependencies (#21 via #24, #22 via #28, #26 via #29).
- L8 (2026-10-28, user verbatim): "que dispare la corrida de recordatorios del #8 de inmediato" -> #42; allowed roles left for Phase 1.
- L9 (2026-10-28, user verbatim): "con lo que acabas de hacer, completa las vistas de la version 1 que te dije V3" — 10 missing views identified (V3 · 09–18).
- L10 (2026-10-28, user verbatim): "guarda hasta aqui" — paused. Pending: screen 17 fix (admin view vs read-only for CHECKER), then #5 overpayment question.
- L2: coverage audit (previous turn) found no view fully covered; 7 views without any issue; schema gaps (customer name, invoice dueDate/folio, extra statuses).
