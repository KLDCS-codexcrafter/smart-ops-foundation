# 4DSmartOps Architecture · Sprint T-Phase-1.2.5h-c1

## Architectural Invariants

- **D-127** — `src/pages/erp/accounting/vouchers/` is ZERO TOUCH. Streak counter at **4** (h-a → h-b1 → h-b2 → h-c1).
- **D-128** — `src/types/voucher.ts` and `src/types/voucher-type.ts` BYTE-IDENTICAL across forks. Sibling fields permitted, never renames.
- **D-194** — Phase 1 is localStorage-only with `[JWT]` markers at every boundary. Phase 2 swaps to REST without changing call sites.
- **D-216** — Pure engines never persist. Caller decides whether to cache/store.
- **MCA Rule 3(1)** — Universal audit trail · cannot be disabled · 8-year retention.
- **CGST Rule 56(8)** — Edit/delete protection via voucher-version-engine (posted records become version N+1).
- **CGST Rule 56(12)** — Monthly Production Accounts report.

## 1. Card Dependency Graph

```mermaid
graph TD
  C1[Card #1 · FineCore<br/>Vouchers + Trial Balance]
  C2[Card #2 · Inventory<br/>GRN · MIN · CE · CycleCount · RTV]
  C25[Card #2.5 · Hardening<br/>Audit Trail · Approval · Quota]
  C3[Card #3 · SalesX<br/>Quote · SO · SRM · DM · IM]
  C4[Card #4 · Pay-Hub<br/>Loans · Advances · Expenses]
  C5[Card #5 · ProjX<br/>Time entries · Project centres]

  C1 --> C2
  C1 --> C3
  C2 --> C3
  C25 --> C1
  C25 --> C2
  C25 --> C3
  C25 --> C4
  C25 --> C5
```

## 2. Voucher Data Flow (O2C)

```mermaid
graph LR
  Q[Quotation<br/>QT/FY/NNNN] -->|convert| SO[Sales Order<br/>SO/FY/NNNN]
  SO -->|allocate| SRM[Supply Req Memo<br/>SRQM/FY/NNNN]
  SRM -->|dispatch| DM[Delivery Memo<br/>DM/FY/NNNN]
  DM -->|invoice| IM[Invoice Memo<br/>IM/FY/NNNN]
  IM -->|post| SI[Sales Invoice<br/>SI/FY/NNNN]
  SI -->|GL post| FC[FineCore Trial Balance]

  Q -.reservation.-> SR[Stock Reservation<br/>Level A · 48h TTL]
  SO -.reservation.-> SR2[Stock Reservation<br/>Level B · until ship]
```

## 3. Multi-Tenant Key Scoping (Bucket A/B/C)

```mermaid
graph TD
  Start[New storage key?] --> Q1{Truly global<br/>config or seed?}
  Q1 -->|Yes| BA[Bucket A · GLOBAL<br/>e.g. erp_voucher_types_template]
  Q1 -->|No| Q2{Has both template<br/>AND per-entity copy?}
  Q2 -->|Yes| BB[Bucket B · DUAL<br/>template + erp_X_<entity>]
  Q2 -->|No| BC[Bucket C · ENTITY<br/>erp_X_<entity> only]

  BA -.read-only.-> All[All entities]
  BB -.fallback chain.-> All
  BC -.strict isolation.-> One[Single entity]
```

## 4. Audit Trail Architecture (MCA Rule 3(1))

```mermaid
graph LR
  Caller[Hook/Page] --> Engine[approval-workflow-engine<br/>OR direct logAudit]
  Engine --> Audit[audit-trail-engine<br/>logAudit · ALWAYS WRITES]
  Audit --> Store[(localStorage<br/>erp_audit_trail_<entity>)]
  Audit -.bypass quota.-> Quota[storage-quota-engine<br/>audit_trail intent ALWAYS allowed]
  Store --> Report[AuditTrailReport · CSV export]
  Store --> Mpa[MonthlyProductionAccounts<br/>CGST Rule 56(12)]
```

## 5. Phase 1 vs Phase 2 Boundary

```mermaid
graph TD
  subgraph Phase1[Phase 1 · localStorage]
    LS[localStorage keys<br/>erp_*_<entity>]
    Hooks[React hooks · ls/ss helpers]
    Engines[Pure engines<br/>D-216 no-persist]
  end
  subgraph Phase2[Phase 2 · REST · backend]
    API[/api/* endpoints/]
    DB[(PostgreSQL)]
  end
  Hooks -.JWT marker.-> API
  LS -.swap path.-> API
  API --> DB
```

## Cross-Module FK Pattern

Foreign keys cross modules via human-readable codes (not UUIDs) to keep
localStorage compact and Phase 2 migration deterministic.

| Source | FK | Target |
|---|---|---|
| MIN | `to_godown_id` | godown master |
| GRN | `vendor_id` | party master |
| Voucher | `entity_code` | entity master |
| Audit Trail | `record_id` + `entity_type` | any record |
| Cycle Count | `superseded_by` | newer cycle count (CGST 56(8) chain) |

Every cross-module read uses entity-scoped storage keys (Bucket B/C) so
single-entity tenants never leak data across boundaries.
