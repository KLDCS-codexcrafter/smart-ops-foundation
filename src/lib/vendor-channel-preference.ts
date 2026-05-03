/**
 * @file        vendor-channel-preference.ts
 * @sprint      T-Phase-1.2.6f-a-fix · FIX-5 · D-254 depth
 * @purpose     Sibling storage for per-vendor RFQ channels (D-249 preserves VendorMaster).
 * @[JWT]       GET/POST /api/procure360/vendor-channel-preference
 */
import type { RFQSendChannel } from '@/types/rfq';

export const vendorChannelPrefKey = (entityCode: string): string =>
  `erp_vendor_channel_pref_${entityCode}`;

export type VendorChannelPrefMap = Record<string, RFQSendChannel[]>;

const DEFAULT_CHANNELS: RFQSendChannel[] = ['internal'];

export function getVendorChannels(vendorId: string, entityCode: string): RFQSendChannel[] {
  try {
    const raw = localStorage.getItem(vendorChannelPrefKey(entityCode));
    if (!raw) return DEFAULT_CHANNELS;
    const map = JSON.parse(raw) as VendorChannelPrefMap;
    return map[vendorId] && map[vendorId].length > 0 ? map[vendorId] : DEFAULT_CHANNELS;
  } catch {
    return DEFAULT_CHANNELS;
  }
}

export function setVendorChannels(
  vendorId: string,
  channels: RFQSendChannel[],
  entityCode: string,
): void {
  try {
    const raw = localStorage.getItem(vendorChannelPrefKey(entityCode));
    const map = (raw ? JSON.parse(raw) : {}) as VendorChannelPrefMap;
    map[vendorId] = channels;
    localStorage.setItem(vendorChannelPrefKey(entityCode), JSON.stringify(map));
  } catch {
    /* quota silent */
  }
}
