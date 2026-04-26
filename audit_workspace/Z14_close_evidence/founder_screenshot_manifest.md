# Founder Smoke Backlog — Sprint Z14 Block 1

**Owner:** Founder (Codexcrafter)
**Effort:** ~70 min · 6 sessions · 18 screenshots
**Blocks:** Phase 1 formal close (Gates 5, 6, 7) · Sprint Z14 invariants I-11 → I-14

---

## Session 1 — Z2a Smoke + Trial Balance (~10 min)

- [ ] Login → `/erp/smoke-test` → "Run All Tests" → screenshot to `audit_workspace/Z2a_close_evidence/smoke_test_result.png`
- [ ] Post 3 vouchers: Sales Invoice ₹1,234.56 + Receipt ₹0.10 + Receipt ₹0.20
- [ ] Open Trial Balance · verify Dr-Cr difference = **EXACTLY ₹0.00** (not 0.01 tolerance)
- [ ] Screenshot to `audit_workspace/Z2a_close_evidence/trial_balance_correctness.png`
- [ ] **STOP if non-zero** — Phase 1 close blocked, regression sprint required

## Session 2 — Z2b Smoke + TDS Correctness (~10 min)

- [ ] `/erp/smoke-test` → screenshot if not already done
- [ ] Create Sales Invoice ₹100,000 · apply TDS @ 10%
- [ ] Verify TDS = **₹10,000.00 exactly** (not 9,999.99 or 10,000.01)
- [ ] Screenshot to `audit_workspace/Z2b_close_evidence/tds_correctness_test.png`

## Session 3 — Z2c-a Commission Spot-Test (~10 min)

- [ ] Visit Commission Register · pick/create entry: ₹100k invoice · 10% commission · 5% TDS
- [ ] Open commission preview · enter ₹50k receipt amount
- [ ] Verify Commission ₹5,000.00 · TDS ₹250.00 · Net ₹4,750.00 (all exact)
- [ ] Screenshot to `audit_workspace/Z2c_a_close_evidence/commission_register_spot.png`

## Session 4 — Z3 Period Lock + Actor (~15 min · 5 screenshots)

- [ ] `/erp/accounting/mock-auth` · switch to "accountant1" → screenshot
- [ ] Create Sales Invoice · save · open · verify `created_by` shows "accountant1" → screenshot
- [ ] `/erp/accounting/period-lock` · lock through `2026-03-31` → screenshot
- [ ] Try Sales Invoice dated `2026-03-15` · expect rejection toast → screenshot
- [ ] Try Sales Invoice dated `2026-04-15` · expect success → screenshot
- [ ] All 5 to `audit_workspace/Z3_close_evidence/`

## Session 5 — Z9 Master Import/Export (~15 min · 4 screenshots)

- [ ] Customer Master · Export CSV · Template · edit (add 1 + modify 1 email) · Import · verify "1 added · 1 updated · 0 errors" → screenshot
- [ ] Vendor Master · Export Excel · verify .xlsx download → screenshot
- [ ] Logistic Master · Template · verify CSV headers → screenshot
- [ ] Scheme Master · import with empty Code field · verify per-row error → screenshot
- [ ] All 4 to `audit_workspace/Z9_close_evidence/`

## Session 6 — Z10 LedgerMaster Sub-Type (~10 min · 3 screenshots)

- [ ] Ledger Master · Cash sub-tab · Export CSV · edit (add 1) · Import · verify "1 added" → screenshot
- [ ] Bank sub-tab · Template · verify Bank-specific headers → screenshot
- [ ] Asset sub-tab · import with empty Code field · verify per-row error → screenshot
- [ ] All 3 to `audit_workspace/Z10_close_evidence/`

---

## Stop-and-Check-In Triggers

Pause and message Lovable + Claude immediately if:
1. Trial balance non-zero Dr-Cr difference
2. TDS produces ₹9,999.99 or ₹10,000.01
3. Any of 14 standard voucher types fails to save
4. Commission preview off by even ₹0.01

**Total: 18 screenshots across 6 audit_workspace folders. Once complete, message Claude for Block 3 (Horizon Close Declaration).**
