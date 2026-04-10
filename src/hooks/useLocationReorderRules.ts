import { useState } from 'react';
import { toast } from 'sonner';
import type { LocationReorderRule, DepartmentTag } from '@/types/location-reorder-rule';

const KEY_RULES = 'erp_location_reorder_rules';
const KEY_TAGS = 'erp_department_tags';

const now = new Date().toISOString();

const DEFAULT_DEPT_TAGS: DepartmentTag[] = [
  { id: 'dt-1', name: 'Production', color: '#7C3AED', is_system: true, created_at: now },
  { id: 'dt-2', name: 'Sales / Dispatch', color: '#0F766E', is_system: true, created_at: now },
  { id: 'dt-3', name: 'QC Hold', color: '#B45309', is_system: true, created_at: now },
  { id: 'dt-4', name: 'Raw Material Store', color: '#1D4ED8', is_system: true, created_at: now },
  { id: 'dt-5', name: 'Finished Goods Store', color: '#15803D', is_system: true, created_at: now },
  { id: 'dt-6', name: 'Export', color: '#BE123C', is_system: true, created_at: now },
];

const loadRules = (): LocationReorderRule[] => {
  try { return JSON.parse(localStorage.getItem(KEY_RULES) || '[]'); } catch { return []; }
};

const loadTags = (): DepartmentTag[] => {
  try {
    const raw = localStorage.getItem(KEY_TAGS);
    if (!raw) {
      // Seed defaults on first load
      localStorage.setItem(KEY_TAGS, JSON.stringify(DEFAULT_DEPT_TAGS)); /* [JWT] CRUD /api/inventory/department-tags */
      return DEFAULT_DEPT_TAGS;
    }
    const parsed = JSON.parse(raw);
    return parsed.length > 0 ? parsed : DEFAULT_DEPT_TAGS;
  } catch { return DEFAULT_DEPT_TAGS; }
};

export function useLocationReorderRules() {
  const [rules, setRules] = useState<LocationReorderRule[]>(loadRules());
  const [tags, setTags] = useState<DepartmentTag[]>(loadTags());

  const saveRules = (d: LocationReorderRule[]) => { localStorage.setItem(KEY_RULES, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/reorder-rules */ };
  const saveTags = (d: DepartmentTag[]) => { localStorage.setItem(KEY_TAGS, JSON.stringify(d)); /* [JWT] CRUD /api/inventory/department-tags */ };

  // ── Rule CRUD ──
  const createRule = (rule: LocationReorderRule) => {
    const u = [rule, ...rules]; setRules(u); saveRules(u);
    toast.success('Reorder rule created');
    // [JWT] POST /api/inventory/reorder-rules
  };

  const updateRule = (id: string, data: Partial<LocationReorderRule>) => {
    const u = rules.map(r => r.id === id ? { ...r, ...data, updated_at: new Date().toISOString() } : r);
    setRules(u); saveRules(u);
    // [JWT] PATCH /api/inventory/reorder-rules/:id
  };

  const deleteRule = (id: string) => {
    const u = rules.filter(r => r.id !== id); setRules(u); saveRules(u);
    toast.success('Reorder rule deleted');
    // [JWT] DELETE /api/inventory/reorder-rules/:id
  };

  // ── Tag CRUD ──
  const createTag = (tag: DepartmentTag) => {
    const u = [tag, ...tags]; setTags(u); saveTags(u);
    toast.success(`Department tag "${tag.name}" created`);
    // [JWT] POST /api/inventory/department-tags
  };

  const updateTag = (id: string, data: Partial<DepartmentTag>) => {
    const u = tags.map(t => t.id === id ? { ...t, ...data } : t);
    setTags(u); saveTags(u);
    // [JWT] PATCH /api/inventory/department-tags/:id
  };

  const deleteTag = (id: string) => {
    const target = tags.find(t => t.id === id);
    if (target?.is_system) { toast.error('Cannot delete system tag'); return; }
    const u = tags.filter(t => t.id !== id); setTags(u); saveTags(u);
    toast.success('Department tag deleted');
    // [JWT] DELETE /api/inventory/department-tags/:id
  };

  // ── Queries ──
  const getByGodown = (godownId: string) => rules.filter(r => r.godown_id === godownId);
  // [JWT] GET /api/inventory/reorder-rules?godown_id=

  const getByDepartment = (tagId: string) => rules.filter(r => r.department_tag_id === tagId);
  // [JWT] GET /api/inventory/reorder-rules?department_tag_id=

  const getByItem = (itemId: string) => rules.filter(r => r.item_id === itemId);
  // [JWT] GET /api/inventory/reorder-rules?item_id=

  return {
    rules, tags,
    createRule, updateRule, deleteRule,
    createTag, updateTag, deleteTag,
    getByGodown, getByDepartment, getByItem,
  };
}
