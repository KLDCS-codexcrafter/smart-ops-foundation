/**
 * Sprint T-Phase-1.C.1f · Block K · Tier 2/3 OOBs S27-S40 + Sarathi 2nd consumer
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  registerEngineerMarketplaceProfile,
  listAvailableEngineers,
  matchEngineerToTicket,
  createRefurbishedUnit,
  markRefurbReady,
  markRefurbSold,
  markRefurbRecycled,
  computeRefurbMarginByGrade,
  listRefurbishedUnits,
  listSparesByTier,
  detectEngineerBurnout,
  suggestServiceQuote,
  aggregateVoiceOfCustomerKeywords,
  computeCustomerPnL,
  seedFutureTaskRegister,
  listFutureTasks,
  updateFutureTaskStatus,
} from '@/lib/servicedesk-engine';
import {
  emitMobileVendorViewToProcure360,
  listProcureHubSarathiMobileStubs,
} from '@/lib/servicedesk-bridges';

const E = 'OPRX';
beforeEach(() => localStorage.clear());

describe('S27 EngineerMarketplace', () => {
  it('registers + lists + matches by skill', () => {
    registerEngineerMarketplaceProfile({
      entity_id: E, engineer_id: 'eng-1', engineer_name: 'A',
      engagement_type: 'subcontractor', capacity_hours_per_week: 40,
      skill_tags: ['hvac'], certification_links: [], payment_terms: 'NET30',
      invoicing_method: 'gst_invoice', hourly_rate_paise: 50000,
      is_available: true, notes: '',
    });
    expect(listAvailableEngineers({ entity_id: E }).length).toBe(1);
    expect(matchEngineerToTicket(['hvac'], E).length).toBe(1);
    expect(matchEngineerToTicket(['plumbing'], E).length).toBe(0);
  });
});

describe('S29 RefurbishedUnit lifecycle', () => {
  it('runs through 4-state machine + margin calc', () => {
    const u = createRefurbishedUnit({
      entity_id: E, original_serial: 'SN-1', product_id: 'P-1',
      refurb_grade: 'A', acquired_via: 'trade_in',
      acquired_at: new Date().toISOString(),
      refurb_cost_paise: 10000, resale_price_paise: 15000, notes: '',
    });
    expect(u.status).toBe('in_refurb');
    expect(u.margin_paise).toBe(5000);
    markRefurbReady(u.id, 'a', E);
    markRefurbSold(u.id, 'a', 'C-1', E);
    const margins = computeRefurbMarginByGrade(E);
    expect(margins.A.count).toBe(1);
    expect(margins.A.total_margin).toBe(5000);
    expect(listRefurbishedUnits({ entity_id: E, status: 'sold' }).length).toBe(1);
  });
  it('supports recycle path', () => {
    const u = createRefurbishedUnit({
      entity_id: E, original_serial: 'SN-2', product_id: 'P-1',
      refurb_grade: 'C', acquired_via: 'b_stock',
      acquired_at: new Date().toISOString(),
      refurb_cost_paise: 1000, resale_price_paise: 0, notes: '',
    });
    markRefurbReady(u.id, 'a', E);
    const recycled = markRefurbRecycled(u.id, 'a', E);
    expect(recycled.status).toBe('recycled');
    expect(recycled.recycled_at).not.toBeNull();
  });
});

describe('S30 listSparesByTier', () => {
  it('returns empty when no spares marked', () => {
    expect(listSparesByTier('A', E)).toEqual([]);
  });
});

describe('S31 detectEngineerBurnout', () => {
  it('returns empty when no tickets', () => {
    expect(detectEngineerBurnout(E)).toEqual([]);
  });
});

describe('S32 suggestServiceQuote', () => {
  it('returns severity-scaled charge with low confidence when matrix empty', () => {
    const q = suggestServiceQuote('REPAIR', 'critical', E);
    expect(q.suggested_charge_paise).toBe(Math.round(500 * 100 * 4));
    expect(q.confidence).toBe('low');
  });
});

describe('S35 Voice of Customer', () => {
  it('returns empty when no feedback', () => {
    expect(aggregateVoiceOfCustomerKeywords(E)).toEqual([]);
  });
});

describe('S28 Customer P&L', () => {
  it('returns empty when no AMCs', () => {
    expect(computeCustomerPnL(E)).toEqual([]);
  });
});

describe('Future Task Register', () => {
  it('seeds 5 entries idempotently', () => {
    const a = seedFutureTaskRegister(E);
    const b = seedFutureTaskRegister(E);
    expect(a.length).toBe(5);
    expect(b.length).toBe(5);
    expect(b[0].id).toBe(a[0].id);
  });
  it('lists + updates status', () => {
    seedFutureTaskRegister(E);
    const all = listFutureTasks({ entity_id: E });
    expect(all.length).toBe(5);
    const updated = updateFutureTaskStatus(all[0].id, 'in_progress', 'admin', E);
    expect(updated.status).toBe('in_progress');
    expect(listFutureTasks({ entity_id: E, status: 'in_progress' }).length).toBe(1);
  });
});

describe('⭐ D-NEW-DI Sarathi 2nd consumer · Procure-Hub mobile vendor view', () => {
  it('emits + populates stub + 2nd consumer wired', () => {
    const ev = emitMobileVendorViewToProcure360({
      oem_claim_packet_id: 'PKT-1', vendor_id: 'V-1', entity_id: E,
      view_purpose: 'oem_claim_status',
    });
    expect(ev.type).toBe('servicedesk:mobile_vendor_view_request');
    expect(ev.originating_card_id).toBe('servicedesk');
    const stubs = listProcureHubSarathiMobileStubs();
    expect(stubs.length).toBe(1);
    expect(stubs[0].vendor_id).toBe('V-1');
  });
  it('appends multiple events', () => {
    emitMobileVendorViewToProcure360({ oem_claim_packet_id: 'PKT-1', vendor_id: 'V-1', entity_id: E, view_purpose: 'oem_claim_status' });
    emitMobileVendorViewToProcure360({ oem_claim_packet_id: 'PKT-2', vendor_id: 'V-2', entity_id: E, view_purpose: 'vendor_profile_update' });
    expect(listProcureHubSarathiMobileStubs().length).toBe(2);
  });
});
