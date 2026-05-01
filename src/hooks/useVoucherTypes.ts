/**
 * useVoucherTypes.ts — Voucher Types master CRUD hook
 * Pattern: identical to all 27 other ERP hooks (localStorage + [JWT] comments)
 * [JWT] Replace with GET/POST/PUT/DELETE /api/accounting/voucher-types
 *
 * Sprint T-Phase-1.2.5h-a · Bucket B migration: storage now entity-scoped
 *   - TEMPLATE_KEY (`erp_voucher_types_template`)  → global seed catalog
 *   - voucherTypesKey(entityCode)                  → per-entity active VTs
 * Backward-compat: legacy `erp_voucher_types` is auto-migrated on first read.
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { VoucherType } from '@/types/voucher-type';
import { VOUCHER_TYPE_SEEDS } from '@/data/voucher-type-seed-data';
import { useEntityCode } from '@/hooks/useEntityCode';

const TEMPLATE_KEY = 'erp_voucher_types_template';
const LEGACY_KEY = 'erp_voucher_types';
export const voucherTypesKey = (entityCode: string): string =>
  entityCode ? `erp_voucher_types_${entityCode}` : TEMPLATE_KEY;

const load = (entityCode: string): VoucherType[] => {
  try {
    // [JWT] GET /api/accounting/voucher-types?entityCode={e}
    const entityRaw = localStorage.getItem(voucherTypesKey(entityCode));
    if (entityRaw) {
      const stored = JSON.parse(entityRaw) as VoucherType[];
      if (stored.length > 0) return stored;
    }
    // Backward-compat: auto-migrate legacy global key into entity-scoped key
    const legacyRaw = localStorage.getItem(LEGACY_KEY);
    if (legacyRaw) {
      // [JWT] One-time migration: legacy global → entity-scoped
      localStorage.setItem(voucherTypesKey(entityCode), legacyRaw);
      const stored = JSON.parse(legacyRaw) as VoucherType[];
      if (stored.length > 0) return stored;
    }
    // Fallback: seed catalog (template) for new entities
    const templateRaw = localStorage.getItem(TEMPLATE_KEY);
    if (templateRaw) {
      const stored = JSON.parse(templateRaw) as VoucherType[];
      if (stored.length > 0) {
        // [JWT] POST /api/accounting/voucher-types · seed for new entity
        localStorage.setItem(voucherTypesKey(entityCode), templateRaw);
        return stored;
      }
    }
  } catch { /* ignore */ }
  // First-ever load — seed both template and entity-scoped key
  // [JWT] POST /api/accounting/voucher-types
  const seedJson = JSON.stringify(VOUCHER_TYPE_SEEDS);
  localStorage.setItem(TEMPLATE_KEY, seedJson);
  localStorage.setItem(voucherTypesKey(entityCode), seedJson);
  return VOUCHER_TYPE_SEEDS;
};

export function useVoucherTypes() {
  const { entityCode } = useEntityCode();
  const [types, setTypes] = useState<VoucherType[]>(() => load(entityCode));

  const save = (data: VoucherType[]) => {
    // [JWT] POST /api/accounting/voucher-types?entityCode={e}
    localStorage.setItem(voucherTypesKey(entityCode), JSON.stringify(data));
  };

  const updateType = (id: string, patch: Partial<VoucherType>) => {
    const vt = types.find(t => t.id === id);
    if (!vt) return;
    // Guard: base_voucher_type cannot change if current_sequence > 1
    if (patch.base_voucher_type && patch.base_voucher_type !== vt.base_voucher_type && vt.current_sequence > 1) {
      toast.error('Cannot change base type after live vouchers exist');
      // [JWT] Server must also enforce this: CHECK count of erp_group_vouchers WHERE voucher_type_id = id
      return;
    }
    const updated = types.map(t =>
      t.id === id ? { ...t, ...patch, updated_at: new Date().toISOString() } : t
    );
    setTypes(updated);
    save(updated);
    toast.success(`${vt.name} updated`);
    // [JWT] PUT /api/accounting/voucher-types/:id
  };

  const createCustomType = (form: Omit<VoucherType, 'id' | 'is_system' | 'created_at' | 'updated_at'>) => {
    const now = new Date().toISOString();
    const vt: VoucherType = {
      ...form, id: `vt-custom-${Date.now()}`,
      is_system: false, created_at: now, updated_at: now,
    };
    const updated = [...types, vt];
    setTypes(updated);
    save(updated);
    toast.success(`${vt.name} created`);
    // [JWT] POST /api/accounting/voucher-types
    return vt;
  };

  const toggleActive = (id: string) => {
    const vt = types.find(t => t.id === id);
    if (!vt) return;
    if (vt.current_sequence > 1 && vt.is_active) {
      toast.error('Cannot deactivate — live vouchers exist for this type');
      return;
    }
    updateType(id, { is_active: !vt.is_active });
    toast.success(`${vt.name} ${vt.is_active ? 'deactivated' : 'activated'}`);
  };

  const addRule = (voucherTypeId: string, rule: Omit<import('@/types/voucher-type').BehaviourRule, 'id'>) => {
    const vt = types.find(t => t.id === voucherTypeId);
    if (!vt) return;
    const newRule = { ...rule, id: `rule-${Date.now()}` };
    updateType(voucherTypeId, { behaviour_rules: [...vt.behaviour_rules, newRule] });
  };

  const removeRule = (voucherTypeId: string, ruleId: string) => {
    const vt = types.find(t => t.id === voucherTypeId);
    if (!vt) return;
    updateType(voucherTypeId, { behaviour_rules: vt.behaviour_rules.filter(r => r.id !== ruleId) });
  };

  const toggleRule = (voucherTypeId: string, ruleId: string) => {
    const vt = types.find(t => t.id === voucherTypeId);
    if (!vt) return;
    updateType(voucherTypeId, {
      behaviour_rules: vt.behaviour_rules.map(r => r.id === ruleId ? { ...r, is_active: !r.is_active } : r)
    });
  };

  const stats = {
    total: types.length,
    active: types.filter(t => t.is_active).length,
    system: types.filter(t => t.is_system).length,
    custom: types.filter(t => !t.is_system).length,
    withRules: types.filter(t => t.behaviour_rules.length > 0).length,
  };

  const deleteType = (id: string) => {
    const vt = types.find(t => t.id === id);
    if (!vt) return;
    if (vt.is_system) {
      toast.error('Cannot delete a system voucher type');
      return;
    }
    if (vt.current_sequence > 1) {
      toast.error('Cannot delete — vouchers have been posted with this type');
      return;
    }
    const updated = types.filter(t => t.id !== id);
    setTypes(updated);
    save(updated);
    // [JWT] DELETE /api/accounting/voucher-types/:id
    toast.success(`"${vt.name}" deleted`);
  };

  return { types, stats, updateType, createCustomType, toggleActive, addRule, removeRule, toggleRule, deleteType };
}
