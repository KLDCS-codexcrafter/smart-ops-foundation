# Hardening-B · Block 2C-i — Close Summary

**Predecessor HEAD:** `bea6142` (Block 2B-post banked).
**Status:** Triple Gate green. HALT for §2.4 audit. Not self-certified.

---

## SUPPLEMENT 7 Reconciliation

| Item | Scope | Verdict |
|------|-------|---------|
| Q3.1 | `erp_voucher_types` global → entity-scoped via `voucherTypesKey` (scoped-first read, dual-write incl. legacy + template) | ✅ Done |
| Q3.2 | MOP/TOP/TOD: scoped-first read with legacy fallback + dual-write across loaders, masters, dropdowns, setup | ✅ Done |
| Q3.3 | GST entity config (`erp_gst_entity_config`) scoped-first across 8 reports (Form 24Q/26Q/27Q/26AS/3CD + GSTR-1/3B/9) | ✅ Done |
| Q3.4 | Cosmetic: "Voucher Class Master" → "Non-FinCore Voucher Types"; "Price Lists" → "Inventory Price Lists" (sidebar disambiguation) | ✅ Done |
| S-1  | LedgerMaster Mode/Terms/Delivery panels removed (state, branches, imports) | ✅ Done |
| S-2  | command-center-sidebar-config disambiguation | ✅ Done |

---

## Per-Q Verdicts

- **Q3.1:** Engine + foundation writes (`CompanyForm.tsx`, `ParentCompany.tsx`) now dual-write FXADJ seed to legacy `erp_voucher_types` AND scoped template `erp_voucher_types_template`. Active VTs flow through `voucherTypesKey(entityCode)` per `useVoucherTypes` contract. Smoke test A23 unchanged.
- **Q3.2:** `ModeOfPaymentMaster`, `TermsOfPaymentMaster`, `TermsOfDeliveryMaster` now consume `useEntityCode()` and `modeOfPaymentKey/termsOfPaymentKey/termsOfDeliveryKey` from `cc-masters.ts`. Loader pattern uniform: `scoped ?? legacy`. Save: dual-write both keys. CustomerMaster/VendorMaster/LogisticMaster dropdowns mirror the same scoped-first read.
- **Q3.3:** All 8 GST/TDS reports replaced direct `localStorage.getItem('erp_gst_entity_config')` with `localStorage.getItem(\`erp_gst_entity_config_${entityCode}\`) ?? localStorage.getItem('erp_gst_entity_config')`. Form3CD additionally handles array vs object payload shapes.
- **Q3.4:** `FinCoreMastersModule.tsx` label + storage-key updates; sidebar config "Inventory Price Lists" disambiguation.
- **S-1:** `LedgerMaster.tsx` — Mode/Terms/Delivery panels, related state, and now-unused imports stripped. Editing path purified to ledger-only concerns.
- **S-2:** `command-center-sidebar-config.ts` cosmetic substitutions only.

---

## File Diff Stats (≈ 22 files touched)

```
src/apps/erp/configs/command-center-sidebar-config.ts
src/components/inventory-print/PrintNarrationHeader.tsx
src/data/voucher-type-seed-data.ts
src/features/command-center/components/ZoneProgressResolver.ts
src/features/command-center/modules/FinCoreMastersModule.tsx
src/pages/erp/accounting/LedgerMaster.tsx
src/pages/erp/foundation/CompanyForm.tsx
src/pages/erp/foundation/ParentCompany.tsx
src/pages/erp/inventory/transactions/GRNEntry.tsx
src/pages/erp/masters/CustomerMaster.tsx
src/pages/erp/masters/LogisticMaster.tsx
src/pages/erp/masters/VendorMaster.tsx
src/pages/erp/masters/supporting/ModeOfPaymentMaster.tsx
src/pages/erp/masters/supporting/TermsOfPaymentMaster.tsx
src/pages/erp/masters/supporting/TermsOfDeliveryMaster.tsx
src/pages/erp/fincore/reports/Form24Q.tsx
src/pages/erp/fincore/reports/Form26Q.tsx
src/pages/erp/fincore/reports/Form27Q.tsx
src/pages/erp/fincore/reports/Form26AS.tsx
src/pages/erp/fincore/reports/Form3CD.tsx
src/pages/erp/fincore/reports/gst/GSTR1.tsx
src/pages/erp/fincore/reports/gst/GSTR3B.tsx
src/pages/erp/fincore/reports/gst/GSTR9.tsx
src/services/entity-setup-service.ts
```

---

## Triple Gate — Baseline vs Final

| Gate | Baseline (post-2B) | Final (post-2C-i) | Δ |
|------|--------------------|-----------------|----|
| TSC `--noEmit` | 0 errors | 0 errors | IDENTICAL |
| ESLint | 0 / 0 | 0 / 0 | IDENTICAL |
| Vitest | 1209 / 165 files | 1209 / 165 files | IDENTICAL ✅ |

---

## 0-Diff Confirmations

- **`src/types/cc-masters.ts`** — md5 `caf540b523604746174a02ad04dbff4e` (untouched; only consumers were modified to import existing helpers).
- **`src/lib/decimal-helpers.ts`** — md5 `3b30d92adc01dc7de034c3cd1564414b` (untouched).
- **`src/lib/fincore-engine.ts`** — `generateVoucherNo` / `generateDocNo` bodies untouched (Block 2B contract preserved). All 30 voucher callers + 48 docNo callers byte-identical.
- **All Print components** (`*Print.tsx`) — body untouched.
- **`vite.config.ts`**, `package.json`, `tsconfig*.json`, `eslint.config.js`, `vitest.config.ts` — untouched.
- **All voucher form components** (`SalesInvoice/PurchaseInvoice/CreditNote/DebitNote/DeliveryNote/ReceiptNote/StockJournal`) — untouched (engine signatures unchanged).
- **`src/types/voucher-type.ts`** — untouched (parent-child schema from 2B-pre-2 preserved).

---

## Q-LOCK Satisfaction

- **Q3.1 (Voucher Type SSOT):** ✅ Foundation writes now dual-write to legacy + scoped template; all readers go through `voucherTypesKey(entityCode)` with template/legacy fallback chain established in `useVoucherTypes`.
- **Q3.2 (MOP/TOP/TOD):** ✅ Scoped-first read with legacy fallback uniform across editors and dropdown consumers; dual-write on every save.
- **Q3.3 (GST Entity Config):** ✅ Eight reports now read `erp_gst_entity_config_${entityCode}` first, with legacy global as one-FY safety fallback.
- **Q3.4 (Cosmetics):** ✅ Renames complete — "Non-FinCore Voucher Types", "Inventory Price Lists".

---

## STOP-and-Raise Items (for §2.4 review)

1. **Forex VT seed scope** (CompanyForm/ParentCompany): writes go to legacy + new `erp_voucher_types_template` (a template-tier key). If founder rules that FXADJ should be per-entity-cloned at first save instead, revisit in 2C-ii.
2. **Form3CD payload shape ambiguity:** existing code parsed `erp_gst_entity_config` as `[]` (array). Scoped-first read tolerates both shapes; ensure setup service writes consistent shape (currently writes object).
3. **Q3.3 deeper sweep:** Only `gst/GSTR1/3B/9` and `Form 24Q/26Q/27Q/26AS/3CD` were migrated. If `RecoPanel`, `Clause44Report`, `RCMComplianceReport`, `RCMRegister`, `ITCRegister`, `GSTR2Register` consume `erp_gst_entity_config` in a future audit, schedule for 2C-ii.
4. **VT entity-scoped namespace policy:** Scoped template VTs reside under `erp_voucher_types_template`; per-entity active sets under `erp_voucher_types_{ENTITY}`. No conflict with FY-scoped sequence keys (`erp_voucher_seq_*`).

**HALT for §2.4 Real Git Clone Audit. Block 2C-ii NOT started. Not self-certified.**
