/**
 * useHazmatProfiles.ts — CRUD for HazmatProfile records.
 * Sprint T-Phase-1.2.5
 * [JWT] GET/POST/PATCH /api/inventory/hazmat-profiles
 */
import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import { hazmatProfilesKey, type HazmatProfile } from '@/types/hazmat-profile';
import type { InventoryItem } from '@/types/inventory-item';

function ls<T>(key: string): T[] {
  try {
    // [JWT] GET /api/entity/storage/:key
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}
function ss<T>(key: string, data: T[]): void {
  // [JWT] POST /api/entity/storage/:key
  localStorage.setItem(key, JSON.stringify(data));
}

export function useHazmatProfiles(entityCode: string) {
  const key = hazmatProfilesKey(entityCode);
  const [profiles, setProfiles] = useState<HazmatProfile[]>(() => ls<HazmatProfile>(key));

  const refresh = useCallback(() => setProfiles(ls<HazmatProfile>(key)), [key]);

  const createProfile = useCallback((p: HazmatProfile) => {
    setProfiles(prev => {
      const next = [p, ...prev];
      ss(key, next);
      // [JWT] POST /api/inventory/hazmat-profiles
      return next;
    });
    toast.success(`Hazmat profile "${p.profile_name}" created`);
  }, [key]);

  const updateProfile = useCallback((id: string, patch: Partial<HazmatProfile>) => {
    setProfiles(prev => {
      const next = prev.map(x =>
        x.id === id ? { ...x, ...patch, updated_at: new Date().toISOString() } : x);
      ss(key, next);
      // [JWT] PATCH /api/inventory/hazmat-profiles/:id
      return next;
    });
  }, [key]);

  const deleteProfile = useCallback((id: string) => {
    setProfiles(prev => {
      const next = prev.filter(x => x.id !== id);
      ss(key, next);
      // [JWT] DELETE /api/inventory/hazmat-profiles/:id
      return next;
    });
    toast.success('Hazmat profile deleted');
  }, [key]);

  /** Returns the linked profile for a given item (via item.hazmat_profile_id). */
  const getProfileForItem = useCallback((item: InventoryItem | null | undefined): HazmatProfile | null => {
    if (!item?.hazmat_profile_id) return null;
    return profiles.find(p => p.id === item.hazmat_profile_id) ?? null;
  }, [profiles]);

  return { profiles, refresh, createProfile, updateProfile, deleteProfile, getProfileForItem };
}
