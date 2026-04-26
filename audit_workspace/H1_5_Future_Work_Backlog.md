# H1.5 Future Work Backlog — Phase 1 Continuation Reference

**Document version:** v1.0
**Generated:** Apr-2026 (post-H1.5-Z Z14 close + D5 audit-as-close)
**Purpose:** Navigation/summary layer over v31 roadmap Sheet 17 (Future Backlog · 346 rows)
**Status:** Active · references Sheet 17 row numbers for drill-down · NOT a duplicate

---

## 1. Executive Summary

Phase 1 actual completion stands at **~35-40% by card surface area** and **~50-60% by depth on the 8 active cards**. The platform inventory totals **28 entities**: 8 ACTIVE · 18 COMING_SOON · 1 hidden (Bridge) · 1 NEW (Leak Register signature module · Sheet 4).

Recent sub-horizon closes: **H1.5-A** (Multi-Company Hygiene) · **H1.5-B** (FineCore through 2b.2) · **H1.5-C** (S1-S6.5b-patch · 10 sprints) · **H1.5-D** (D1-D5 audit-as-close · 6 sprints) · **H1.5-Z** (Zero Debt · 26 sprints).

Counter status: **36 D-decisions** locked (D-115 → D-150) plus **D-151** added in v31 · **23 audit_workspace evidence folders** · ESLint `--max-warnings 0` discipline preserved across the entire H1.5-Z run.

Phase 1 Exit Gates (Sheet 26): Gate 1 **GREEN-leaning-YELLOW** · Gates 2-3 **YELLOW** · Gates 4-7 **RED**.

**Next 3 immediate priorities (execution order):**
1. D-149 5 visual spot-checks (~15 min · Phase 2-pre interstitial)
2. H1.5-B.3a Inventory prints + voucher type extension (Sheet 1 R7 · P0 NEXT)
3. T8 PayOut MVP (closes 10-active-card MVP target · Sheet 1 R5)

**Estimated remaining Phase 1 timeline: 18-24 months** (per Sheet 1 R16-R17 adjusted post-discovery).

---

## 2. Post-H1.5-Z Findings (Section V additions to Sheet 17 · v31)

| # | Category | Item | Priority | Sheet 17 Row |
|---|---|---|---|---|
| 1 | Code Quality | D5 Math.round → Decimal migration (last non-Decimal arithmetic site) | P3 | R341 |
| 2 | Code Quality | 4 false-positive `any` cleanup (cosmetic ESLint hygiene) | P3 | R342 |
| 3 | Pre-existing Infra | ImportHubModule + OpeningLedgerBalanceModule consolidation (per D-146 parallel-path) | P2 | R343 |
| 4 | Visual Validation | D-149 5 spot-checks (Phase 2-pre prerequisite) | P1 | R344 |
| 5 | Quality Audit | Live Hub Module-Depth Audit (4 hubs · skeleton vs MVP grading) | P1 | R345 |
| 6 | Roadmap Hygiene | Sheet 26 Gate 1 status update (DONE in v31) | P0 | R346 |

These 6 items emerged during the Z14 close + D5 audit-as-close + v31 roadmap pass. None block Phase 1 close; items 4-5 gate Phase 2 first execution sprint.

---

## 3. Phase 1 Exit Gates Current Snapshot (Sheet 26 · Apr-2026)

| Gate | Description | Status | Next Review |
|---|---|---|---|
| 1 | All 28 audit findings closed | GREEN-leaning-YELLOW (16/28 closed · 12 deferred per D-145/D-147) | May-2026 |
| 2 | All 17 product pillars skeleton | YELLOW (~10 of 17) | Jun-2026 |
| 3 | All 11 industry packs seed data | YELLOW | Jul-2026 |
| 4 | Decision Engine D-129 + Workflow Engine D-130 spec | RED | Sep-2026 |
| 5 | Phase 2 backend architecture documented | RED | Dec-2026 |
| 6 | NTT Data deployment runbook | RED | Q4-2026 |
| 7 | Founder confidence "Sinha touch tomorrow" | RED | Q1-2027 |

Gates 1-3 are closeable inside Phase 1; Gates 4-7 require Phase 2 input (backend integration, deployment partner, founder UX sign-off).

---

## 4. Next 3-6 Months Priority Sequence (Execution Order)

1. **D-149 5 visual spot-checks** (~15 min · Phase 2-pre · Sheet 17 R344) — gates Phase 2 first execution sprint
2. **H1.5-B.3a Inventory Prints + Voucher Type Extension** (~1 week · Sheet 1 R7 · alignment DONE · prompt-writing next)
3. **H1.5-B.3b Print Configuration layer** (~1 week · Tally-style · 14 vouchers)
4. **H1.5-B.2c Export Triad** (CSV/XLSX/PDF/JSON/XML · ~2 weeks · Sheet 17 R14)
5. **H1.5-B.2d 13 Per-Type Voucher Registers** (~2-3 weeks · Sheet 17 R15)
6. **T8 PayOut card** (2 sprints · MVP-closer · Sheet 1 R5 · Sheet 17 R23)
7. **T19 Comply360** (3 sprints · biggest India moat · Sheet 1 R6 · Sheet 17 Section J)
8. **H1.5-C resume (S6 + S7-S11)** (after backlog · 6 sprints · supporting masters · Sheet 17 R156-R193)
9. **Live Hub Re-audit** (1 sprint · all 4 hubs · Sheet 17 R345 · NEW)
10. **H1.5-K Event Bus Infrastructure** (1-2 weeks · Sheet 17 R7 · prerequisite for Leak Register)

This is a priority sequence with effort + dependency notes — NOT a sprint plan. Founder approves each sprint individually.

---

## 5. Reference Source Mapping (4DSmartOps Register Tie-in)

| Coming Soon Card | TDL/Code Precedent | 4DSmartOps Ref ID |
|---|---|---|
| Procure360 | DOC-01 Pre-Purchase Management Guide + S-10 purchase TDLs | DOC-01 + S-10 |
| Store Hub | TDL-01 Physical Stock Verification + S-10 inventory TDLs | TDL-01 + S-10 |
| Production | PROD-03 Charis (20 transactions · 10 reports) | PROD-03 |
| MaintainPro | TDL-04 Fixed Assets Warranty + AMC | TDL-04 |
| ServiceDesk | S-07 Smart Power LIVE + TDL-02 TallyWARM | S-07 + TDL-02 |
| Comply360 | TDL-03 Compliance (30+ TDL files for GST/TDS/26AS) | TDL-03 |
| RequestX | DOC-01 + S-10 (purchase indent flow) | DOC-01 + S-10 |
| Qulicheak | DOC-03 QC Control Presentation | DOC-03 |
| (PeoplePay built) | TDL-05 HRMS Prime (already validated) | TDL-05 |
| (WhatsApp 4D Series) | TDL-08 WhatsApp Voucher Trigger | TDL-08 |

Coming Soon cards are NOT greenfield — 25-year TDL precedents inform extraction. Always reference the relevant S-XX / TDL-XX / PROD-XX / DOC-XX entry before sprint planning.

---

## 6. Live Hub Module-Depth Audit Findings (Partial · Apr-2026)

**4 hubs with Coming Soon fallback panels (per repo cross-check):**

| Hub | Module Routes | ComingSoonPanel Fallbacks | Severity |
|---|---|---|---|
| SalesX Hub | 31 modules wired (LIVE_SALESX_MODULES = 31) | 0 explicit fallback (depth/quality unknown) | Re-audit needed |
| Customer Hub | 14 case routes | 3 fallback to ComingSoonPanel | MEDIUM |
| Distributor Hub | 17 case routes | 3 fallback to ComingSoonPanel | MEDIUM |
| Logistics Hub | 15 case routes | 3 fallback to ComingSoonPanel | MEDIUM |

**Recommendation:** Dedicated `T-Live-Hub-Reaudit` sprint per hub OR consolidated audit pass producing `Live_Hub_Reaudit_Findings.md` with per-module status (skeleton vs MVP vs production-grade) + severity-tagged gaps. Estimated 1 sprint.

Cross-reference: Sheet 17 R345 (Section V item 5).

---

## 7. Effort Totals + Calendar Timeline (Honest Reality Check)

| Category | Items | Effort Estimate | Sheet 17 Reference |
|---|---|---|---|
| T10-pre completion (B.3a → B.2d) | 4 sprints | 6-7 weeks | Section A |
| Sub-horizon resumption (H1.5-C/K/L/E/F) | 5+ horizons | 12-16 weeks | Section B/F |
| T8 PayOut + T19 Comply360 + H1.5-M | 3 cards | 8-10 weeks | Section B |
| EximX (depends on Comply360) | 1 card | 3-4 weeks | Section B |
| 18 Coming Soon tile builds | 18 horizons × 2-5 sprints each | 40-90 sprints | Section B/N |
| 11 Industry Packs seed data | 11 packs | 5-8 weeks | Section O |
| Live Hub re-audit (4 hubs) | 1 sprint | 1-2 weeks | Section V (R345) |
| H1.5-LEAK Leak Register | 1 horizon | 4-6 sprints | Section P/0.1 |
| H1.5-AMC ServiceDesk + AMC | 1 horizon (post-ServiceDesk + MaintainPro) | 6-8 sprints | Section B |
| **TOTAL Phase 1 remaining** | | **18-24 months** | |

The 18-24 month figure matches Sheet 1 R16-R17 (~9-12 months original · adjusted post-discovery). Sequence respects Sheet 9 dependency layers L0→L6.

---

## 8. Backlog Update Protocol

**Trigger events for backlog update:**
- Sprint closes (sprint that maps to a Sheet 17 row)
- Strategic priority shift (founder decision)
- New Coming Soon tile activated (placeholder → in development)
- Dependency unblocks (e.g., FineCore complete unblocks T19)

**Update mechanics:**
- Sheet 17 rows updated incrementally (add-only · per Sheet 17 R126 "1. Add-only")
- Items move ⏳ → 🟡 (in progress) → ✅ (closed) with date
- This document version increments: v1.0 → v1.1 (minor) → v2.0 (major restructure)
- v31 → v32 → v33 roadmap updates trigger document refresh
- Each closure references its D-decision OR audit_workspace evidence path

**Authority:** Founder makes priority decisions · Claude/Lovable execute against Sheet 17 inventory · summary doc reflects current state.

**Frequency:** Updated post every sprint close OR every 2 weeks · whichever first.

---

**End of H1_5_Future_Work_Backlog.md v1.0**

Sources: v31 roadmap (Sheets 1, 4, 8, 9, 17, 26, 0.1) · 4DSmartOps Reference Register v1.0 · audit_workspace/PHASE_1_EXIT_REPORT.md · audit_workspace/D5_close_evidence/D5_close_summary.md
