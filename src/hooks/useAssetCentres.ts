/**
 * useAssetCentres.ts — Asset Centre CRUD hook
 * Sprint T-Phase-1.1.2-pre · D-218 two-master architecture
 * Storage: assetCentresKey(entityCode) = erp_asset_centres_{entityCode}
 * [JWT] GET/POST/PUT/DELETE /api/finecore/asset-centres
 */
import { useState, useCallback } from 'react';
import type { AssetCentre } from '@/types/finecore/asset-centre';
import { assetCentresKey, ASSET_CENTRE_SEQ_KEY } from '@/types/finecore/asset-centre';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    return JSON.parse(localStorage.getItem(key) || '[]');
  } catch { return []; }
}

function ss<T>(key: string, val: T): void {
  // [JWT] PUT /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(val));
}

function nextAssetCentreCode(entityCode: string): string {
  const key = ASSET_CENTRE_SEQ_KEY(entityCode);
  const raw = localStorage.getItem(key);
  const seq = raw ? parseInt(raw, 10) + 1 : 1;
  localStorage.setItem(key, String(seq));
  return `ACT-${String(seq).padStart(4, '0')}`;
}

export function useAssetCentres(entityCode: string = DEFAULT_ENTITY_SHORTCODE) {
  const key = assetCentresKey(entityCode);
  const [centres, setCentres] = useState<AssetCentre[]>(() => ls<AssetCentre>(key));

  const refresh = useCallback(() => setCentres(ls<AssetCentre>(key)), [key]);

  const createAssetCentre = useCallback((data: Omit<AssetCentre, 'id' | 'code' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const ac: AssetCentre = {
      ...data,
      id: `ac-${Date.now()}`,
      code: nextAssetCentreCode(entityCode),
      created_at: now,
      updated_at: now,
    };
    const all = [...ls<AssetCentre>(key), ac];
    ss(key, all);
    setCentres(all);
    // [JWT] POST /api/finecore/asset-centres
    return ac;
  }, [key, entityCode]);

  const updateAssetCentre = useCallback((id: string, patch: Partial<Omit<AssetCentre, 'id' | 'code' | 'created_at'>>) => {
    const all = ls<AssetCentre>(key).map(ac =>
      ac.id === id ? { ...ac, ...patch, updated_at: new Date().toISOString() } : ac);
    ss(key, all);
    setCentres(all);
    // [JWT] PATCH /api/finecore/asset-centres/:id
  }, [key]);

  const deleteAssetCentre = useCallback((id: string) => {
    const all = ls<AssetCentre>(key).filter(ac => ac.id !== id);
    ss(key, all);
    setCentres(all);
    // [JWT] DELETE /api/finecore/asset-centres/:id
  }, [key]);

  const toggleActive = useCallback((id: string) => {
    const current = ls<AssetCentre>(key).find(ac => ac.id === id);
    if (!current) return;
    updateAssetCentre(id, {
      status: current.status === 'active' ? 'inactive' : 'active',
    });
  }, [key, updateAssetCentre]);

  return { centres, createAssetCentre, updateAssetCentre, deleteAssetCentre, toggleActive, refresh };
}
