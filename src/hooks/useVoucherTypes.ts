/**
 * useVoucherTypes.ts — Voucher Types master CRUD hook
 * Pattern: identical to all 27 other ERP hooks (localStorage + [JWT] comments)
 * [JWT] Replace with GET/POST/PUT/DELETE /api/accounting/voucher-types
 */
import { useState } from 'react';
import { toast } from 'sonner';
import type { VoucherType } from '@/types/voucher-type';
import { VOUCHER_TYPE_SEEDS } from '@/data/voucher-type-seed-data';

const KEY = 'erp_voucher_types';

const load = (): VoucherType[] => {
  try {
    // [JWT] GET /api/accounting/voucher-types
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const stored = JSON.parse(raw) as VoucherType[];
      if (stored.length > 0) return stored;
    }
  } catch { /* ignore */ }
  // First load — seed the 24 Tally defaults
  // [JWT] POST /api/accounting/voucher-types
  localStorage.setItem(KEY, JSON.stringify(VOUCHER_TYPE_SEEDS));
  return VOUCHER_TYPE_SEEDS;
};

export function useVoucherTypes() {
  const [types, setTypes] = useState<VoucherType[]>(load);

  const save = (data: VoucherType[]) => {
    // [JWT] POST /api/accounting/voucher-types
    localStorage.setItem(KEY, JSON.stringify(data));
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
