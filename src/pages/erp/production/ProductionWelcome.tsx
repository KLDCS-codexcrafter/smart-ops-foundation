/**
 * @file     ProductionWelcome.tsx
 * @sprint   T-Phase-1.3-3a-pre-1
 * @purpose  Welcome panel · 4 KPI tiles + 1 adaptive tile based on ProductionConfig flags.
 */
import { useMemo } from 'react';
import { Briefcase, Users, FlaskConical, ExternalLink, Factory, Layers, Clock, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useProductionOrders } from '@/hooks/useProductionOrders';
import { useProductionConfig } from '@/hooks/useProductionConfig';

interface Props {
  onNavigate?: (m: string) => void;
}

export function ProductionWelcome(_props: Props): JSX.Element {
  void _props;
  const { orders } = useProductionOrders();
  const productionConfig = useProductionConfig();

  const stats = useMemo(() => {
    const todayStr = new Date().toISOString().slice(0, 10);
    return {
      todayOutput: orders.filter(o => o.status === 'completed' && o.actual_completion_date?.slice(0, 10) === todayStr).length,
      wip: orders.filter(o => o.status === 'in_progress').length,
      pendingReleases: orders.filter(o => o.status === 'draft').length,
      shortages: 0,
      projectLinked: orders.filter(o => o.project_id).length,
      contractMfg: orders.filter(o => o.is_job_work_in).length,
      batchProd: orders.filter(o => o.batch_no).length,
      jwo: orders.filter(o => o.linked_job_work_out_order_ids.length > 0).length,
    };
  }, [orders]);

  const adaptiveTile = useMemo(() => {
    if (productionConfig.enableEngineerToOrder)
      return { label: 'Project-Linked', icon: Briefcase, count: stats.projectLinked };
    if (productionConfig.enableContractManufacturingInward)
      return { label: 'Contract Mfg', icon: Users, count: stats.contractMfg };
    if (productionConfig.enableProcessManufacturing)
      return { label: 'Batch Production', icon: FlaskConical, count: stats.batchProd };
    if (productionConfig.enableJobWorkOutSubContracting)
      return { label: 'Job Work Out', icon: ExternalLink, count: stats.jwo };
    return null;
  }, [productionConfig, stats]);

  const tiles = [
    { label: "Today's Output", icon: Factory, count: stats.todayOutput },
    { label: 'WIP Items', icon: Layers, count: stats.wip },
    { label: 'Pending Releases', icon: Clock, count: stats.pendingReleases },
    { label: 'Material Shortages', icon: AlertTriangle, count: stats.shortages },
    ...(adaptiveTile ? [adaptiveTile] : []),
  ];

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Production</h1>
        <p className="text-sm text-muted-foreground">
          Manage production orders · BOM consumption · WIP tracking · 6 production patterns
        </p>
      </div>

      <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
        ⓘ Masters live in <span className="font-medium">Command Center → Compliance Settings → Production Configuration</span>.
        Edit there to keep all modules in sync.
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
        {tiles.map(t => {
          const Icon = t.icon;
          return (
            <Card key={t.label}>
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-muted-foreground">{t.label}</span>
                  <Icon className="h-4 w-4 text-primary" />
                </div>
                <div className="text-2xl font-mono font-bold">{t.count}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

export default ProductionWelcome;
