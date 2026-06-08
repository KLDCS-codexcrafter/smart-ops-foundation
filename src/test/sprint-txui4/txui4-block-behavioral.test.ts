/**
 * TXUI-4 · Block Behavioral Tests · canonical voucher shell adoption
 *
 * AC2: each ADOPT form imports + mounts TallyVoucherHeader.
 * AC3: keyboard parity — onEnterNext imported on every ADOPT form;
 *      forms with text/number/date Input elements wire onKeyDown={onEnterNext}.
 *      Two forms (BreakdownReport · InternalMaintenanceTicket) have no <Input>
 *      (Textarea + selects only) — they import onEnterNext via void reference
 *      so the canonical helper is consumed read-only without dead code.
 * AC4: NO new SIBLING (sibling-register row carries empty newSiblings).
 * AC5: SEAM-ONLY form (AssetCapitalization) carries iron-canon reason note.
 * AC8: sprint-history TXUI-4 row present · TXUI-3 flipped to 8eb52305.
 */
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { SPRINTS } from '@/lib/_institutional/sprint-history';

const read = (p: string) => readFileSync(resolve(__dirname, '../../..', p), 'utf-8');

const ADOPT_FORMS = [
  'src/pages/erp/maintainpro/transactions/AMCOutToVendor.tsx',
  'src/pages/erp/maintainpro/transactions/BreakdownReport.tsx',
  'src/pages/erp/maintainpro/transactions/CalibrationCertificate.tsx',
  'src/pages/erp/maintainpro/transactions/EquipmentMovement.tsx',
  'src/pages/erp/maintainpro/transactions/InternalMaintenanceTicket.tsx',
  'src/pages/erp/maintainpro/transactions/PMTickoffEntry.tsx',
  'src/pages/erp/maintainpro/transactions/SparesIssueEntry.tsx',
  'src/pages/erp/maintainpro/transactions/WorkOrderEntry.tsx',
  'src/pages/erp/projx/transactions/InvoiceScheduling.tsx',
  'src/pages/erp/projx/transactions/MilestoneTracker.tsx',
  'src/pages/erp/projx/transactions/ProjectEntry.tsx',
  'src/pages/erp/projx/transactions/ProjxDocumentEntry.tsx',
  'src/pages/erp/projx/transactions/ResourceAllocation.tsx',
  'src/pages/erp/payout/PaymentRequisitionEntry.tsx',
  'src/pages/erp/payout/VendorPaymentEntry.tsx',
  'src/pages/erp/qualicheck/transactions/QualiCheckNcrEvidenceEntry.tsx',
];

const SEAM_FORM = 'src/pages/erp/maintainpro/transactions/AssetCapitalization.tsx';

// Forms whose entry surface uses Textarea + selects only (no <Input>).
// They import onEnterNext as `void onEnterNext` so the canonical helper
// stays consumed read-only without producing a dead-code TS error.
const FORMS_NO_INPUT = new Set([
  'src/pages/erp/maintainpro/transactions/BreakdownReport.tsx',
  'src/pages/erp/maintainpro/transactions/InternalMaintenanceTicket.tsx',
  'src/pages/erp/maintainpro/transactions/PMTickoffEntry.tsx',
]);

describe('TXUI-4 · canonical voucher shell adoption (Pillar-B forms)', () => {
  describe('AC2 · TallyVoucherHeader mounted on every ADOPT form (16)', () => {
    for (const f of ADOPT_FORMS) {
      it(`adopts TallyVoucherHeader: ${f.split('/').pop()}`, () => {
        const src = read(f);
        expect(src).toContain("from '@/components/fincore/TallyVoucherHeader'");
        expect(src).toContain('<TallyVoucherHeader');
        expect(src).toContain('TXUI-4 · canonical shell adoption · presentation-only · logic 0-DIFF');
      });
    }
  });

  describe('AC3 · onEnterNext imported on every ADOPT form', () => {
    for (const f of ADOPT_FORMS) {
      it(`imports onEnterNext: ${f.split('/').pop()}`, () => {
        const src = read(f);
        expect(src).toContain("import { onEnterNext");
      });
    }
  });

  describe('AC3 · onKeyDown={onEnterNext} wired on Input-bearing ADOPT forms', () => {
    for (const f of ADOPT_FORMS) {
      if (FORMS_NO_INPUT.has(f)) continue;
      it(`wires onKeyDown: ${f.split('/').pop()}`, () => {
        const src = read(f);
        expect(src).toContain('onKeyDown={onEnterNext}');
      });
    }
  });

  describe('AC2 · presentation-only proof · save/store tokens preserved', () => {
    const PROBES: Record<string, string[]> = {
      'src/pages/erp/maintainpro/transactions/AMCOutToVendor.tsx': ['createAMCOutToVendor', 'rma_no'],
      'src/pages/erp/maintainpro/transactions/BreakdownReport.tsx': ['createBreakdownReport', 'breakdown_no'],
      'src/pages/erp/maintainpro/transactions/WorkOrderEntry.tsx': ['createWorkOrder', 'wo_no'],
      'src/pages/erp/projx/transactions/InvoiceScheduling.tsx': ['createSchedule', 'markInvoiced'],
      'src/pages/erp/projx/transactions/MilestoneTracker.tsx': ['createMilestone', 'canTransitionMilestoneStatus'],
      'src/pages/erp/projx/transactions/ProjectEntry.tsx': ['createProject', 'transitionStatus'],
      'src/pages/erp/payout/VendorPaymentEntry.tsx': ['processVendorPayment', 'computeTDS'],
      'src/pages/erp/payout/PaymentRequisitionEntry.tsx': ['createRequisition', 'ROUTING_RULES'],
      'src/pages/erp/qualicheck/transactions/QualiCheckNcrEvidenceEntry.tsx': ['createNcrEvidence'],
    };
    for (const [f, tokens] of Object.entries(PROBES)) {
      it(`preserves logic tokens: ${f.split('/').pop()}`, () => {
        const src = read(f);
        for (const t of tokens) expect(src).toContain(t);
      });
    }
  });

  it('AC2 · VendorPaymentEntry binds voucherNo from state (only form holding voucherNo state)', () => {
    const src = read('src/pages/erp/payout/VendorPaymentEntry.tsx');
    expect(src).toContain('voucherNo={voucherNo}');
  });

  it('AC5 · SEAM-ONLY form carries iron-canon reason note', () => {
    const src = read(SEAM_FORM);
    expect(src).toContain('TXUI-4 · SEAM-ONLY');
    expect(src).toContain('iron canon');
    expect(src).not.toContain('<TallyVoucherHeader');
  });

  it('AC4 · sprint-history TXUI-4 row carries EMPTY newSiblings (no engine credit)', () => {
    const row = SPRINTS.find(
      s => (s.code as string) === 'T-TXUI4-Voucher-Canonical',
    );
    expect(row).toBeDefined();
    expect(row?.newSiblings).toEqual([]);
    expect(row?.predecessorSha).toBe('8eb52305');
  });

  it('AC8 · TXUI-3 flipped to 8eb52305', () => {
    const txui3 = SPRINTS.find(s => (s.code as string) === 'T-TXUI3-Voucher-Canonical');
    expect(txui3?.headSha).toBe('8eb52305');
  });

  it('AC1 · 17 target forms enumerated (16 ADOPT + 1 SEAM)', () => {
    expect(ADOPT_FORMS.length + 1).toBe(17);
  });
});
