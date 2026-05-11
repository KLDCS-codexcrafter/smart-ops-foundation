# Sprint T-Phase-1.A.16a · MaintainPro Foundation (Masters) · CLOSE SUMMARY

Predecessor: 9dea67c (A.15b.T1 close)
Sprint: 39th first-pass A target · 11th card on Shell pattern · D-NEW-CT auto-extends 10→11 cards

## Deliverables
- Block A: `src/types/maintainpro.ts` · 6 master types (Equipment 35 fields · Spare Parts replica · Calibration TDL 9 fields · Fire Safety TDL 5 fields × 6 types · PM Schedule Template 4-axis · Maintenance Vendor CC replica with `vendor_type='service_provider'` per founder May 12 SSOT discipline)
- Block A.2 SKIP: no global vendor_type union extension (no canonical union exists; CC SSOT preserved per FR-12/13/54; FR-72 candidate path registered for Phase 2 if 4+ consumers need precise maintenance categorization)
- Block B: `src/lib/maintainpro-engine.ts` Path B 6th consumer · CRUD + OOB helpers (M5 calibration quarantine · M6 fire cascade · M8 warranty · M10 PM next-due calendar · M11 genealogy descendants · M12 ESG energy)
- Block C: Shell migration · `maintainpro-sidebar-config.ts` (8 groups · ~38 modules) · `maintainpro-shell-config.ts` (cyan accent) · `MaintainProPage.tsx` · `MaintainProWelcome.tsx` · `MaintainProSidebar.types.ts` · `App.tsx` lazy import + `/erp/maintainpro` route added (Option 1 reconciliation per founder)
- Block D: `EquipmentMaster.tsx` · CRUD + genealogy tree expand
- Block E: 5 master UIs (Spare Parts view · Calibration · Fire Safety 6-type tabs · PM Schedule Template · Maintenance Vendor view) — replica banners cite SSOT per FR-13/54
- Block I: `src/test/maintainpro-engine.test.ts` · 9 tests covering OOB-M5/M6/M8/M10/M11/M12
- Block J: this close summary

## SSOT discipline applied
- Maintenance Vendor View: filter banner reads "SSOT: Command Center · Vendor Master · Sundry Creditor ledger group · filter: vendor type = Service Provider"
- Spare Parts View: filter banner reads "SSOT: Inventory Hub · stock group 'Maintenance Spares'"
- Both replicas zero duplicate entities; helpers stub to empty arrays in Phase 1 with [JWT] markers for Phase 2 wiring

## Entitlement status
- MaintainPro stays `'locked'` at A.16a per Q-LOCK-18 (flips at A.17 Closeout)
- D-NEW-CT self-healing migration auto-includes maintainpro for existing tenants (no manual list update needed)

## Honest disclosures
- A.2 vendor_type union extension SKIPPED — no canonical union file exists; CC remains SSOT
- OOB-M10 4-axis: only calendar axis implemented; meter/usage/season are Phase 1 stubs ([JWT] markers)
- OOB-M11 genealogy: simple recursive list at A.16a; D3 visual tree deferred to A.17
- Demo seed file deferred — engine tests cover seed-equivalent scenarios; sprint summary documents intended Sinha NTPC blower + CAPEX HVAC AHU shape for A.16b consumption

## Path forward
A.16b MaintainPro Foundation (Transactions + Internal Helpdesk) next.

---

## T1 close (A.16a.T1) · 2026-05-12

- T1.1 keyboard namespace: 14 'm *' keyboard shortcuts added to `maintainpro-sidebar-config.ts` · D-NEW-CC 7th consumer registered
- T1.2 demo seed: `src/data/demo-maintainpro-data.ts` created with 2 Sinha equipment + PM template + calibration + fire safety entries
- AC#8 + AC#13 now PASS · 13/13 ACs clean post-T1
- 39th composite BANKS POST-T1 · A.16b path open
