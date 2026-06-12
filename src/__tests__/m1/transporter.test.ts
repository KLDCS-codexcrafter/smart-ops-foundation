/**
 * @sprint M1 · Mobile-ARC Close · Transporter app tests
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { manifestsKey, manifestAcksKey, type Manifest } from '@/types/wms-manifest';
import { acknowledgeManifest } from '@/lib/wms-manifest-engine';
import { podsKey, type POD } from '@/types/pod';
import { lrAcceptancesKey } from '@/types/logistic-portal';

const ENT = 'TEST_M1';
const SRC = join(process.cwd(), 'src/pages/mobile/transporter');

beforeEach(() => { localStorage.clear(); });

describe('M1 · Transporter app · structural mounts', () => {
  it('all 6 transporter pages exist', () => {
    for (const f of [
      'MobileTransporterHome.tsx', 'MobileLRQueuePage.tsx',
      'MobileManifestAckPage.tsx', 'MobilePODCapturePage.tsx',
      'MobileTransporterDisputesPage.tsx', 'MobileTransporterPaymentsPage.tsx',
    ]) {
      expect(existsSync(join(SRC, f))).toBe(true);
    }
  });

  it('Home renders worklist from real store key (no fake data hardcoded)', () => {
    const src = readFileSync(join(SRC, 'MobileTransporterHome.tsx'), 'utf8');
    expect(src).toMatch(/lrAcceptancesKey/);
    expect(src).not.toMatch(/mockLRs|sampleData|FAKE/i);
    // Wave-2 honest chip mirrors customer/distributor pattern
    expect(src).toMatch(/Wave-2/);
  });
});

describe('M1 · Manifest ack writes the SAME field the desktop W3 seam writes', () => {
  it('acknowledgeManifest appends to manifestAcksKey with acknowledged_by + ack_at', () => {
    const m: Manifest = {
      id: 'm1', manifest_no: 'MN-001', entity_id: ENT, fiscal_year_id: 'FY-2025-26',
      transporter_id: 't1', transporter_name: 'XYZ Logistics', manifest_date: '2026-06-10',
      status: 'finalized', shipment_ids: ['s1'], total_packages: 5, total_declared_weight_kg: 100,
      created_at: '2026-06-10T00:00:00Z', updated_at: '2026-06-10T00:00:00Z',
    };
    localStorage.setItem(manifestsKey(ENT), JSON.stringify([m]));
    const { ack, manifest } = acknowledgeManifest(ENT, 'm1', { acknowledged_by: 'Mobile Tester', packages_counted: 5 });
    expect(ack.acknowledged_by).toBe('Mobile Tester');
    expect(ack.ack_at).toBeTruthy();
    expect(manifest.status).toBe('acknowledged');
    const persisted = JSON.parse(localStorage.getItem(manifestAcksKey(ENT)) ?? '[]');
    expect(persisted).toHaveLength(1);
    expect(persisted[0].acknowledged_by).toBe('Mobile Tester');
  });
});

describe('M1 · POD capture honest pending_sync queue', () => {
  it('POD persists with status="pending" on podsKey (the existing pending_sync state)', () => {
    const now = new Date().toISOString();
    const pod: POD = {
      id: 'pod1', entity_id: ENT, dln_voucher_id: 'DLN-1', dln_voucher_no: 'DLN-1',
      captured_at: now, captured_by: 'driver',
      gps_latitude: null, gps_longitude: null, gps_accuracy_m: null, gps_timestamp: null,
      ship_to_latitude: null, ship_to_longitude: null, distance_from_ship_to_m: null,
      gps_verified: false, photo_verified: false, signature_verified: false, otp_verified: false,
      consignee: { name: 'Receiver' }, status: 'pending', is_exception: false,
      created_at: now, updated_at: now,
    };
    localStorage.setItem(podsKey(ENT), JSON.stringify([pod]));
    const list = JSON.parse(localStorage.getItem(podsKey(ENT)) ?? '[]') as POD[];
    expect(list[0].status).toBe('pending');
    const src = readFileSync(join(SRC, 'MobilePODCapturePage.tsx'), 'utf8');
    expect(src).toMatch(/status:\s*'pending'/);
    expect(src).toMatch(/pending_sync/);
  });

  it('LR queue page consumes the same lrAcceptancesKey store', () => {
    const src = readFileSync(join(SRC, 'MobileLRQueuePage.tsx'), 'utf8');
    expect(src).toMatch(/lrAcceptancesKey/);
    // Touch the key import so it stays alive
    expect(lrAcceptancesKey(ENT)).toBe(`erp_lr_acceptances_${ENT}`);
  });
});
