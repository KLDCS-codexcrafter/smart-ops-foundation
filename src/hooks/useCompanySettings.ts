import { useState } from 'react';
import { toast } from 'sonner';
import type { CompanySettings } from '@/types/company-settings';

const KEY = 'erp_company_settings';

const loadAll = (): CompanySettings[] => {
  // [JWT] GET /api/company/settings
  try { return JSON.parse(localStorage.getItem(KEY) || '[]'); } catch { return []; }
};

export function useCompanySettings() {
  const [settings, setSettings] = useState<CompanySettings[]>(loadAll());
  // [JWT] Replace with GET /api/company/settings
  const save = (d: CompanySettings[]) => { localStorage.setItem(KEY, JSON.stringify(d)); /* [JWT] CRUD /api/company/settings */ };

  const getSettings = (entityId: string): CompanySettings | null => {
    const found = settings.find(s => s.entity_id === entityId);
    if (found) return found;
    // Return default if none exists
    const defaultSetting: CompanySettings = {
      id: crypto.randomUUID(),
      entity_id: entityId,
      mrp_tax_treatment: 'inclusive',
      mrp_tax_treatment_label: 'Tax Inclusive (MRP includes GST)',
      rate_change_requires_reason: true,
      base_currency: 'INR',
      default_costing_method: 'weighted_avg',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    // [JWT] GET /api/company/settings?entity_id=
    saveSettings(defaultSetting);   // save it silently
    return defaultSetting;
  };

  const saveSettings = (s: CompanySettings) => {
    const existing = settings.findIndex(x => x.entity_id === s.entity_id);
    let u: CompanySettings[];
    if (existing >= 0) {
      u = settings.map((x, i) => i === existing ? { ...s, updated_at: new Date().toISOString() } : x);
    } else {
      u = [s, ...settings];
    }
    setSettings(u); save(u);
    toast.success('Company settings saved');
    // [JWT] POST /api/company/settings
  };

  const getMRPTaxTreatment = (entityId?: string): 'inclusive' | 'exclusive' => {
    if (entityId) {
      const s = settings.find(x => x.entity_id === entityId);
      if (s) return s.mrp_tax_treatment;
    }
    return 'inclusive'; // default
    // [JWT] GET /api/company/settings/mrp-tax-treatment
  };

  return { settings, getSettings, saveSettings, getMRPTaxTreatment };
}
