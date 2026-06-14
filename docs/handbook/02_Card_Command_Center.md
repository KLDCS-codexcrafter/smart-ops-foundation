# CARD DEEP-DIVE · COMMAND CENTER (the master SSOT hub)
## Operix Developer Handbook — Card Series · GOLD-STANDARD TEMPLATE

**Verified against:** `src/features/command-center/` + registry `applications.ts` at freeze `c30f161`.
**Track relevance:** Frontend (primary) · Backend (masters become the canonical Wave-2 tables) · Mobile (read replicas).

---

## 1. What it is / what it's for
**Command Center is the master Single-Source-of-Truth (SSOT) hub for the entire platform.** It owns the platform-wide masters that every other card depends on: organisation structure, geography, taxes, voucher types, period locks, and the foundational reference data. The registry says it plainly: *"Single source of truth for every department. Other cards render replicas of Command Center data."* If you change a master here, it propagates (conceptually) everywhere. This is the most architecturally important card to understand first.

## 2. Where it lives
- **Folder:** `src/features/command-center/` (modules in `modules/`, shared bits in `components/`)
- **Route:** `/erp/command-center`
- **Category / icon:** Ops Hub · `LayoutDashboard`
- **Registry id:** `command-center`

## 3. The modules (17 — verified)
| Module | What it governs |
|---|---|
| OverviewModule | The CC landing overview |
| FoundationModule | Foundational org/setup masters |
| FinCoreMastersModule | Finance masters (replicated into Fin Core) |
| CRMMastersModule | CRM/customer masters |
| SalesMastersModule | Sales masters |
| DistributorMastersModule | Distributor masters |
| CollectionMastersModule | Collections masters |
| ProductionModule | Production masters |
| OpeningLedgerBalanceModule | Opening ledger balances |
| EmployeeOpeningLoansModule | Employee opening loans |
| ImportHubModule | Bulk import of master data |
| SecurityModule | Security/access masters |
| MasterHealthScorecardPage | Master-data health scoring |
| MasterConflictResolutionPanel | Resolve conflicting master edits |
| FieldLockRulesPanel | Field-level lock rules |
| SyncThrottlePanel | Sync throttle controls |
| CancellationDashboardWidget | Cancellation oversight |

Plus shared components: `PendingActionsList`, `RecentActivityStrip`, and a `ZoneProgressResolver`.

## 4. Why it's the SSOT (the architecture point)
Operix avoids data duplication by having Command Center own the canonical masters. Other cards **render replicas** — they read CC's masters, they don't independently own them. This is what keeps 33 cards consistent. The **Master Conflict Resolution** and **Field Lock Rules** modules exist precisely to govern who can change a master and how conflicts resolve — master-data governance is a first-class concern here (the "master-data intelligence" layer: time-travel master state, lineage/"DNA", conflict resolution).

## 5. Header / sidebar / profile in context
Command Center renders inside the full ERP shell: the two-row `ERPHeader` (date · FY badge · Ctrl+K search · app launcher · notifications · Dishani · profile) and the hub-grouped `AppSidebar`. Its breadcrumb shows e.g. `Command Center › Security Console`. The active **entity** (resolved via `useEntityCode()`) scopes which company's masters you're editing.

## 6. Engines & data
CC's logic leans on the masters/foundation engines and the master-data-intelligence layer in `src/lib`. Reads/writes are entity-scoped (Bucket A global templates vs B/C per-entity). Audit-logged where masters change (MCA Rule 3(1)).

## 7. Track notes
- **Frontend:** when you add a master, decide its bucket (A global template / B dual / C entity-only) and wire CC as its owner; other cards consume, not duplicate.
- **Backend (Wave-2):** CC's masters become the **canonical Postgres tables**; replica-rendering cards read them via API. This is high-priority Wave-2 work (masters are step 4 in the migration order, but they underpin everything).
- **Mobile:** mobile surfaces read CC masters as replicas; they don't edit platform masters.

## 8. Gotchas
- **Don't let another card own a master CC should own** — that's the duplication anti-pattern CC exists to prevent (the "no-duplicity" rule).
- Master edits need conflict-resolution + field-lock awareness — don't bypass those panels with a raw write.
- Entity scope matters doubly here: editing a master under the wrong active entity corrupts the SSOT for that company.

---
*Card deep-dive · Command Center · GOLD-STANDARD TEMPLATE · verified at c30f161 · Operix Developer Handbook card series. This is the depth/format every card doc follows.*
