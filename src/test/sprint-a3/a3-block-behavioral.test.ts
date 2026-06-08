/**
 * @file        src/test/sprint-a3/a3-block-behavioral.test.ts
 * @purpose     Sprint A.3 capstone + bridges behavioral tests
 * @sprint      T-Phase-1.A.3 · T-A3-ServiceDesk-Capstone
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  computeExportQuote,
  PSU_CONTRACT_TEMPLATES,
  getPSUContractTemplate,
  saveIoTRule,
  listIoTRules,
  deleteIoTRule,
  evaluateIoTRules,
  computeOwnPerformance,
  computeEngineerReputation,
  buildServiceTrendsSnapshot,
  buildOEMPortalPacket,
  type IoTThresholdRule,
} from '@/lib/servicedesk-capstone-engine';
import {
  emitOEMPortalWarrantyClaim,
  listOEMPortalWarrantyClaimStubs,
  emitCustomerHealthScoreToInsightX,
  listCustomerHealthScoreSeamEvents,
  emitServiceTrendsToInsightX,
  listInsightXServiceTrendsStubs,
} from '@/lib/servicedesk-bridges';
import { serviceTicketKey } from '@/types/service-ticket';
import { oemClaimKey } from '@/types/oem-claim';

const E = 'A3TEST';

beforeEach(() => {
  localStorage.clear();
});

describe('A.3 · capstone engine · S36 PSU contract', () => {
  it('seeds 3 templates', () => {
    expect(PSU_CONTRACT_TEMPLATES.length).toBe(3);
  });
  it('lookup by id', () => {
    expect(getPSUContractTemplate('psu-tier-a')?.sla_response_hours).toBe(2);
    expect(getPSUContractTemplate('missing')).toBeNull();
  });
});

describe('A.3 · capstone engine · S37 export quote', () => {
  it('applies FX + withholding deterministically', () => {
    const r = computeExportQuote({
      base_amount_paise: 100_000_00, // ₹1,00,000
      target_currency: 'USD',
      fx_rate_inr_per_unit: 100,
      withholding_pct: 10,
    });
    expect(r.gross_in_target).toBe(1000);
    expect(r.withholding_in_target).toBe(100);
    expect(r.net_in_target).toBe(900);
    expect(r.realised_paise_at_quote).toBe(900 * 100 * 100);
  });
});

describe('A.3 · capstone engine · S38 IoT rules CRUD + dry-run', () => {
  it('save / list / delete', () => {
    const rule: IoTThresholdRule = {
      id: 'r1', asset_id: 'AST-1', signal: 'temperature_c', comparator: 'gt',
      threshold_value: 80, severity: 'sev2_high', auto_ticket: true, created_at: '2026-06-08T00:00:00Z',
    };
    saveIoTRule(E, rule);
    expect(listIoTRules(E).length).toBe(1);
    deleteIoTRule(E, 'r1');
    expect(listIoTRules(E).length).toBe(0);
  });
  it('evaluates breaches', () => {
    const rules: IoTThresholdRule[] = [{
      id: 'r1', asset_id: 'AST-1', signal: 'temperature_c', comparator: 'gt',
      threshold_value: 80, severity: 'sev2_high', auto_ticket: true, created_at: '',
    }];
    const breaches = evaluateIoTRules(rules, [
      { asset_id: 'AST-1', signal: 'temperature_c', value: 90 },
      { asset_id: 'AST-1', signal: 'temperature_c', value: 70 },
    ]);
    expect(breaches.length).toBe(1);
    expect(breaches[0].observed).toBe(90);
  });
});

describe('A.3 · capstone engine · S39 own performance + S40 reputation', () => {
  it('honest empty when no tickets', () => {
    const m = computeOwnPerformance(E);
    expect(m.tickets_total).toBe(0);
    expect(m.avg_response_minutes).toBeNull();
    expect(computeEngineerReputation(E)).toEqual([]);
  });
});

describe('A.3 · bridge #13 · emitOEMPortalWarrantyClaim', () => {
  it('refuses when claim missing', () => {
    const r = emitOEMPortalWarrantyClaim({ oem_claim_packet_id: 'nope', entity_id: E });
    expect('ack' in r && r.ack === false).toBe(true);
  });
  it('emits + persists outbox entry when claim present', () => {
    localStorage.setItem(oemClaimKey(E), JSON.stringify([{
      id: 'c1', claim_no: 'CLM-1', entity_id: E, branch_id: 'B', ticket_id: 'T',
      oem_name: 'Acme', spare_id: 'S', spare_name: 'Pump', qty: 1, unit_cost_paise: 50000,
      total_claim_value_paise: 50000, warranty_period_status: 'in_warranty',
      status: 'pending', oem_claim_no: 'OEM-1', submitted_at: null, approved_at: null,
      paid_at: null, paid_amount_paise: 0, rejection_reason: '', notes: '',
      created_at: '', updated_at: '', created_by: '', audit_trail: [],
    }]));
    const r = emitOEMPortalWarrantyClaim({ oem_claim_packet_id: 'c1', entity_id: E });
    expect('packet' in r).toBe(true);
    expect(listOEMPortalWarrantyClaimStubs().length).toBe(1);
  });
  it('packet builder is pure', () => {
    const p = buildOEMPortalPacket({
      id: 'c1', oem_claim_no: 'OEM-1', oem_name: 'Acme', spare_id: 'S', spare_name: 'Pump',
      qty: 2, warranty_period_status: 'in_warranty', total_claim_value_paise: 99,
    } as Parameters<typeof buildOEMPortalPacket>[0]);
    expect(p.qty).toBe(2);
  });
});

describe('A.3 · bridge #14 · emitCustomerHealthScoreToInsightX · SEAM-ONLY', () => {
  it('records SEAM event with reason S22_absent', () => {
    const r = emitCustomerHealthScoreToInsightX({ customer_id: 'CUST-1', entity_id: E });
    expect(r.seam_only).toBe(true);
    expect(r.reason).toBe('S22_absent');
    expect(listCustomerHealthScoreSeamEvents().length).toBe(1);
  });
});

describe('A.3 · bridge #15 · emitServiceTrendsToInsightX', () => {
  it('builds and persists snapshot', () => {
    const r = emitServiceTrendsToInsightX({ entity_id: E });
    expect(r.snapshot.entity_code).toBe(E);
    expect(listInsightXServiceTrendsStubs().length).toBe(1);
  });
  it('snapshot counts open tickets', () => {
    localStorage.setItem(serviceTicketKey(E), JSON.stringify([
      { status: 'raised', severity: 'sev1_critical', reopened_count: 0 },
      { status: 'closed', severity: 'sev3_medium', reopened_count: 0 },
    ]));
    const snap = buildServiceTrendsSnapshot(E);
    expect(snap.total_tickets).toBe(2);
    expect(snap.open_tickets).toBe(1);
    expect(snap.sev1_count).toBe(1);
  });
});

describe('A.3 · walls held · no-duplicity', () => {
  it('the 12 existing bridges remain exported', async () => {
    const mod = await import('@/lib/servicedesk-bridges');
    [
      'consumeSalesInvoiceForAMC',
      'consumeReceiptForAMCPayment',
      'consumeSiteXCommissioningForAMC',
      'emitAMCInvoiceToFinCore',
      'emitCommissionToPeoplePay',
      'emitTellicallerWorkItem',
      'emitServiceTicketToMaintainPro',
      'emitFinalInvoiceToFinCore',
      'emitSparesIssueToInventoryHub',
      'emitOEMClaimPacketToProcure360',
      'emitMobileVendorViewToProcure360',
      'emitRenewalEmailToTemplateEngine',
    ].forEach((name) => {
      expect(typeof (mod as Record<string, unknown>)[name]).toBe('function');
    });
  });
});
