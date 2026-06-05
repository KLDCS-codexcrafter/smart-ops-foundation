/**
 * @file   src/test/sprint-155/ecomx-evidence-camera.test.ts
 * @sprint Sprint 155.T1 · EcomX · Packing Evidence camera path + register filter
 *
 * +4 it() blocks added to the sprint-155 suite (separate file, same prefix).
 *  1) STRUCTURAL no-blob       — every persisted evidence row's JSON < 1KB.
 *  2) Camera-path metadata     — capturedVia='camera' + durationSec recorded.
 *  3) Honesty banner verbatim  — exported constant string equality.
 *  4) Register filter behavior — marketplace/order filters narrow the rows.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  createMarketplace,
  recordPackingEvidence,
  listPackingEvidence,
  PACKING_EVIDENCE_HONESTY_BANNER,
} from '@/lib/ecomx-engine';
import { ecOrdersKey, ecPackingEvidenceKey } from '@/types/ecomx';
import type { EcOrder, EcPackingEvidence } from '@/types/ecomx';

const ENT = 'ECX-CK-T1';

function seedOrder(mpId: string, mpOrderId: string): EcOrder {
  const all: EcOrder[] = JSON.parse(localStorage.getItem(ecOrdersKey(ENT)) || '[]');
  const o: EcOrder = {
    id: `eco-${mpOrderId}`, marketplaceId: mpId, marketplaceOrderId: mpOrderId,
    importId: 'imp', soVoucherId: 'v', soDocNo: 'SO/1', orderDate: '2026-06-05',
    layer: 'b2c_consolidated', endCustomerName: '', endCustomerState: '',
    buyerGstin: null, matchedPartyId: null, lineCount: 1, grossAmount: 100,
    status: 'booked', createdAt: new Date().toISOString(),
  };
  all.push(o);
  localStorage.setItem(ecOrdersKey(ENT), JSON.stringify(all));
  return o;
}

beforeEach(() => { localStorage.clear(); });

describe('S155.T1 · packing evidence camera path', () => {
  it('STRUCTURAL no-blob: each persisted evidence row JSON < 1KB', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const o = seedOrder(mp.id, 'A1');
    // Simulate a large captured clip (size only — the binary itself is never persisted).
    recordPackingEvidence(ENT, {
      ecOrderId: o.id, fileName: 'packing_A1.webm',
      sizeBytes: 5_000_000, durationSec: 28, capturedVia: 'camera',
      note: '', uploadedBy: 'self', originatingDepartmentId: 'ecomx',
    });
    const raw = localStorage.getItem(ecPackingEvidenceKey(ENT)) ?? '[]';
    const rows: EcPackingEvidence[] = JSON.parse(raw);
    expect(rows.length).toBe(1);
    for (const row of rows) {
      const perRowJson = JSON.stringify(row);
      // No field on the row exceeds 1KB — no blob, no data-URL leakage.
      for (const [k, v] of Object.entries(row)) {
        const len = typeof v === 'string' ? v.length : JSON.stringify(v ?? '').length;
        expect(len, `field ${k} must stay <1KB`).toBeLessThan(1024);
      }
      expect(perRowJson.length).toBeLessThan(1024);
    }
  });

  it('camera-path records capturedVia="camera" and a real durationSec', () => {
    const mp = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const o = seedOrder(mp.id, 'A2');
    const ev = recordPackingEvidence(ENT, {
      ecOrderId: o.id, fileName: 'packing_A2.webm',
      sizeBytes: 250_000, durationSec: 17, capturedVia: 'camera',
      note: '', uploadedBy: 'self', originatingDepartmentId: 'ecomx',
    });
    expect(ev.capturedVia).toBe('camera');
    expect(ev.durationSec).toBe(17);
    expect(ev.durationSec).toBeGreaterThan(0);
    expect(ev.durationSec).toBeLessThanOrEqual(30);
  });

  it('honesty banner constant matches the spec string VERBATIM', () => {
    expect(PACKING_EVIDENCE_HONESTY_BANNER).toBe(
      'Clip saved to your downloads — keep it with your records. In-app cloud video storage is a Phase-2 upgrade.',
    );
    expect(PACKING_EVIDENCE_HONESTY_BANNER).toContain('Phase-2');
    expect(PACKING_EVIDENCE_HONESTY_BANNER).toContain('your downloads');
  });

  it('evidence register filters narrow rows by marketplace and order id', () => {
    const mpA = createMarketplace(ENT, { name: 'Amazon IN', type: 'amazon' });
    const mpF = createMarketplace(ENT, { name: 'Flipkart', type: 'flipkart' });
    const oA = seedOrder(mpA.id, 'AMZ-001');
    const oF = seedOrder(mpF.id, 'FK-999');
    recordPackingEvidence(ENT, { ecOrderId: oA.id, fileName: 'a.webm', sizeBytes: 1, durationSec: 5, capturedVia: 'camera', note: '', uploadedBy: 'u', originatingDepartmentId: 'ecomx' });
    recordPackingEvidence(ENT, { ecOrderId: oF.id, fileName: 'f.webm', sizeBytes: 1, durationSec: 5, capturedVia: 'camera', note: '', uploadedBy: 'u', originatingDepartmentId: 'ecomx' });

    const all = listPackingEvidence(ENT);
    expect(all).toHaveLength(2);

    // Marketplace filter (mirrors the EvidenceRegisterPanel logic).
    const byMp = all.filter((r) => r.marketplaceId === mpA.id);
    expect(byMp).toHaveLength(1);
    expect(byMp[0].marketplaceOrderId).toBe('AMZ-001');

    // Order-id substring filter (case-insensitive · mirrors panel logic).
    const q = 'fk-';
    const byOrder = all.filter((r) => r.marketplaceOrderId.toLowerCase().includes(q));
    expect(byOrder).toHaveLength(1);
    expect(byOrder[0].marketplaceId).toBe(mpF.id);

    // Combined filter returns empty when contradictory.
    const none = all.filter((r) => r.marketplaceId === mpA.id && r.marketplaceOrderId.toLowerCase().includes(q));
    expect(none).toHaveLength(0);
  });
});
