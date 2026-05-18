/**
 * @file        VendorCategoriesPanel.tsx
 * @sprint      T-Phase-1.A-b.2-VendorPortal-Communications-Categories
 * @decisions   D-NEW-DN · A-b-Q4=C read-only catalog · A-b-Q8=C Saathi badge · A-b-Q9=C
 */
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ListChecks, Package, Wrench, Truck, Building2, Calculator, Bot } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface VendorCategoryDef {
  id: string;
  label: string;
  hindi_label: string;
  icon: LucideIcon;
  accent: string;
  description: string;
  examples: string[];
  typical_payment_terms: string;
  msme_likelihood: 'high' | 'medium' | 'low';
}

const CATEGORIES: VendorCategoryDef[] = [
  {
    id: 'raw_materials',
    label: 'Raw Materials',
    hindi_label: 'कच्चा माल',
    icon: Package,
    accent: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30',
    description: 'Direct input materials for production · steel · plastic · chemicals · components',
    examples: ['HR coil', 'Granules', 'Solvents', 'PCBs', 'Fasteners'],
    typical_payment_terms: '30-60 days',
    msme_likelihood: 'high',
  },
  {
    id: 'services',
    label: 'Services',
    hindi_label: 'सेवाएँ',
    icon: Wrench,
    accent: 'bg-blue-500/10 text-blue-700 border-blue-500/30',
    description: 'Labour · maintenance · contract manufacturing · job-work · consulting',
    examples: ['AMC contracts', 'Job-work', 'Consulting', 'Testing', 'Calibration'],
    typical_payment_terms: '15-30 days',
    msme_likelihood: 'high',
  },
  {
    id: 'logistics',
    label: 'Logistics & Freight',
    hindi_label: 'परिवहन',
    icon: Truck,
    accent: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
    description: 'Transport · warehousing · packaging · last-mile delivery · customs broker',
    examples: ['Trucking', 'Containers', 'Warehouse rental', 'CHA services'],
    typical_payment_terms: '15-45 days',
    msme_likelihood: 'medium',
  },
  {
    id: 'capex',
    label: 'Capital Expenditure',
    hindi_label: 'पूंजीगत व्यय',
    icon: Building2,
    accent: 'bg-slate-500/10 text-slate-700 border-slate-500/30',
    description: 'Machinery · plant · equipment · capitalized assets · long-life additions',
    examples: ['CNC machines', 'Forklifts', 'Plant building', 'IT hardware'],
    typical_payment_terms: '30-90 days · milestone-based',
    msme_likelihood: 'low',
  },
  {
    id: 'opex',
    label: 'Operating Expenses',
    hindi_label: 'परिचालन व्यय',
    icon: Calculator,
    accent: 'bg-purple-500/10 text-purple-700 border-purple-500/30',
    description: 'Utilities · stationery · cleaning · office supplies · subscriptions · recurring expense',
    examples: ['Electricity', 'Office supplies', 'Software subscriptions', 'Housekeeping'],
    typical_payment_terms: 'Monthly billing',
    msme_likelihood: 'medium',
  },
];

const MSME_BADGE: Record<'high' | 'medium' | 'low', string> = {
  high:   'bg-emerald-500/15 text-emerald-700 border-emerald-500/30',
  medium: 'bg-amber-500/15 text-amber-700 border-amber-500/30',
  low:    'bg-slate-500/15 text-slate-700 border-slate-500/30',
};

export function VendorCategoriesPanel(): JSX.Element {
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="h-10 w-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
            <ListChecks className="h-6 w-6 text-slate-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              Vendor Categories
              <Badge variant="outline" className="text-[10px]">5 · Read-Only Taxonomy</Badge>
            </h1>
            <p className="text-sm text-muted-foreground">
              Fixed classification taxonomy · payment-term defaults · MSME likelihood guidance
            </p>
          </div>
        </div>
        <Badge variant="outline" className="gap-1 text-[10px]">
          <Bot className="h-3 w-3" />Saathi · auto-categorize new vendors · Phase 2
        </Badge>
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {CATEGORIES.map(cat => {
          const Icon = cat.icon;
          return (
            <Card key={cat.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${cat.accent}`}>
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <CardTitle className="text-base">{cat.label}</CardTitle>
                    <CardDescription>{cat.hindi_label}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <p className="text-xs text-muted-foreground">{cat.description}</p>
                <div>
                  <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground mb-1">Examples</p>
                  <div className="flex flex-wrap gap-1">
                    {cat.examples.map(ex => (
                      <Badge key={ex} variant="outline" className="text-[9px]">{ex}</Badge>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 pt-2 border-t">
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">Payment Terms</p>
                    <p className="text-xs font-mono">{cat.typical_payment_terms}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">MSME Likelihood</p>
                    <Badge variant="outline" className={`text-[9px] mt-0.5 ${MSME_BADGE[cat.msme_likelihood]}`}>
                      {cat.msme_likelihood}
                    </Badge>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card className="border-blue-500/30 bg-blue-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <ListChecks className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Phase 2 enhancements</p>
            <p className="text-xs text-muted-foreground">
              Per-tenant customizable taxonomy · auto-assign on vendor creation · category-specific
              compliance checklists · category-level approval workflows · Saathi auto-categorization
              from vendor name + GST classification.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
