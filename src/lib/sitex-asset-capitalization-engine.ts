/**
 * @file        src/lib/sitex-asset-capitalization-engine.ts
 * @purpose     CAPEX site asset capitalization · DR Fixed Asset / CR CWIP voucher prep · FR-52 #5 BD ledger consumer
 * @sprint      T-Phase-1.A.15a SiteX Closeout · OOB #18 · Block G.3
 * @[JWT]       POST /api/fincore/vouchers/asset-capitalization
 */

import { getSite } from './sitex-engine';
import { emitAssetCapitalization } from './sitex-bridges';

export interface CapexAssetLine {
  id: string;
  description: string;
  serial_no: string;
  capitalized_value: number;
  useful_life_years: number;
  cost_centre_id: string | null;
}

export interface AssetCapitalizationDraft {
  site_id: string;
  entity_id: string;
  lines: CapexAssetLine[];
  total: number;
  prepared_at: string;
}

export function prepareCapitalizationDraft(entityCode: string, siteId: string, lines: CapexAssetLine[]): {
  allowed: boolean; reason: string | null; draft: AssetCapitalizationDraft | null;
} {
  const site = getSite(entityCode, siteId);
  if (!site) return { allowed: false, reason: 'Site not found', draft: null };
  if (site.site_mode !== 'capex_internal') {
    return { allowed: false, reason: 'Capitalization only for capex_internal mode', draft: null };
  }
  const total = lines.reduce((s, l) => s + l.capitalized_value, 0);
  return {
    allowed: true, reason: null,
    draft: {
      site_id: siteId,
      entity_id: site.entity_id,
      lines,
      total,
      prepared_at: new Date().toISOString(),
    },
  };
}

export function postCapitalization(entityCode: string, draft: AssetCapitalizationDraft): {
  allowed: boolean; reason: string | null; cwip_voucher_id: string; fixed_asset_voucher_id: string;
} {
  const now = new Date().toISOString();
  const cwip = `CWIP-${Date.now()}`;
  const fa = `FA-${Date.now() + 1}`;
  emitAssetCapitalization({
    type: 'sitex.asset.capitalization',
    site_id: draft.site_id,
    entity_id: draft.entity_id,
    total_capitalized_value: draft.total,
    cwip_voucher_id: cwip,
    fixed_asset_voucher_id: fa,
    timestamp: now,
  });
  return { allowed: true, reason: null, cwip_voucher_id: cwip, fixed_asset_voucher_id: fa };
}
