/**
 * useItemParameters — resolves the Parametric Hub template (if any) linked to an item's stock group.
 *
 * PURPOSE      Voucher item line uses this to decide whether to show a "Parameters" chip
 *              and whether to auto-open ItemParametersDialog on Enter-after-item-name.
 * INPUT        stockGroupId (item.stock_group_id)
 * OUTPUT       ResolvedTemplate | null  (null when no template OR template has 0 parameters)
 * DEPENDENCIES @/pages/erp/inventory/Parametric (ParameterEntry type)
 * TALLY-ON-TOP BEHAVIOR  none (pure resolver)
 * SPEC DOC     Parametric Hub (src/pages/erp/inventory/Parametric.tsx)
 */
import { useMemo } from 'react';
import type { ParameterEntry } from '@/pages/erp/inventory/Parametric';

// Keys used by Parametric Hub (from Parametric.tsx)
const TEMPLATES_KEY = 'erp_param_templates';
const LINKS_KEY     = 'erp_param_stock_group_links';

interface ResolvedTemplate {
  template_id: string;
  template_name: string;
  parameters: ParameterEntry[];
}

interface StoredTemplate {
  id: string;
  name: string;
  parameters: ParameterEntry[];
}
interface StoredLink {
  stock_group_id: string;
  parameter_template_id: string;
}

export function useItemParameters(stockGroupId: string | undefined | null): ResolvedTemplate | null {
  return useMemo(() => {
    if (!stockGroupId) return null;
    try {
      // [JWT] GET /api/inventory/parameter-templates
      const linksRaw     = localStorage.getItem(LINKS_KEY);
      const templatesRaw = localStorage.getItem(TEMPLATES_KEY);
      if (!linksRaw || !templatesRaw) return null;
      const links     = JSON.parse(linksRaw) as StoredLink[];
      const templates = JSON.parse(templatesRaw) as StoredTemplate[];
      const link = links.find(l => l.stock_group_id === stockGroupId);
      if (!link) return null;
      const tpl = templates.find(t => t.id === link.parameter_template_id);
      if (!tpl || !tpl.parameters || tpl.parameters.length === 0) return null;
      return { template_id: tpl.id, template_name: tpl.name, parameters: tpl.parameters };
    } catch { return null; }
  }, [stockGroupId]);
}
