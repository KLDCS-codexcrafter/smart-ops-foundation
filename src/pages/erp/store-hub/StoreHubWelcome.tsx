/**
 * @file        StoreHubWelcome.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card7-7-pre-2 · Block F · D-390
 * @purpose     Store Hub landing dashboard · 4 KPI tiles + Quick Actions.
 */

import { useEffect, useState, useCallback } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Warehouse, ArrowUpRight, ClipboardList, AlertTriangle, TrendingUp, ArrowRight, Plus, Send } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listReorderSuggestions } from '@/lib/store-hub-engine';
import { listStockIssues } from '@/lib/stock-issue-engine';
import { listReceiptAcks } from '@/lib/stock-receipt-ack-engine';
import { useCycleCounts } from '@/hooks/useCycleCounts';
import type { StoreHubModule } from './StoreHubSidebar';

interface Props { onModuleChange: (m: StoreHubModule) => void }

export function StoreHubWelcomePanel({ onModuleChange }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { counts } = useCycleCounts(entityCode);
  const [reorderCount, setReorderCount] = useState(0);
  const [draftIssuesCount, setDraftIssuesCount] = useState(0);
  const [pendingAcksCount, setPendingAcksCount] = useState(0);
  const [varianceValue, setVarianceValue] = useState(0);

  const refresh = useCallback((): void => {
    setReorderCount(listReorderSuggestions(entityCode).filter(r => r.urgency !== 'normal').length);
    setDraftIssuesCount(listStockIssues(entityCode).filter(s => s.status === 'draft').length);
    setPendingAcksCount(listReceiptAcks(entityCode).filter(a => a.status === 'draft').length);
    const posted = (counts ?? []).filter(c => c.status === 'posted');
    setVarianceValue(posted.reduce((sum, c) => sum + Math.abs(c.total_variance_value || 0), 0));
  }, [entityCode, counts]);

  useEffect(() => {
    refresh();
    const i = setInterval(refresh, 8000);
    return () => clearInterval(i);
  }, [refresh]);

  const tiles = [
    { label: 'Reorder Items',    value: reorderCount,     icon: AlertTriangle, accent: 'text-amber-600 bg-amber-500/10',  module: 'sh-r-reorder-suggestions' as StoreHubModule, isCurrency: false },
    { label: 'Draft Issues',     value: draftIssuesCount, icon: ArrowUpRight,  accent: 'text-blue-600 bg-blue-500/10',    module: 'sh-t-stock-issue-register' as StoreHubModule, isCurrency: false },
    { label: 'Pending Acks',     value: pendingAcksCount, icon: ClipboardList, accent: 'text-purple-600 bg-purple-500/10', module: 'sh-t-receipt-ack' as StoreHubModule, isCurrency: false },
    { label: 'Cycle Variance ₹', value: varianceValue,    icon: TrendingUp,    accent: 'text-rose-600 bg-rose-500/10',     module: 'sh-r-cycle-count-status' as StoreHubModule, isCurrency: true },
  ];

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-12 w-12 rounded-xl bg-indigo-500/10 flex items-center justify-center shrink-0">
          <Warehouse className="h-6 w-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">Store Hub</h1>
          <p className="text-sm text-muted-foreground">
            Department-level Stores console · Stock Issue · Receipt Ack · Reorder · Cycle Count
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {tiles.map(t => {
          const Icon = t.icon;
          const display = t.isCurrency ? `₹ ${t.value.toLocaleString('en-IN')}` : t.value;
          return (
            <Card key={t.label} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => onModuleChange(t.module)}>
              <CardContent className="p-4">
                <div className={`h-9 w-9 rounded-lg flex items-center justify-center mb-2 ${t.accent}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="text-xs text-muted-foreground">{t.label}</div>
                <div className="text-2xl font-bold mt-1">{display}</div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardContent className="p-4 space-y-2">
          <div className="text-sm font-medium mb-2">Quick Actions</div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <Button variant="outline" onClick={() => onModuleChange('sh-t-stock-issue-entry')}>
              <Plus className="h-4 w-4 mr-1" />New Stock Issue
            </Button>
            <Button variant="outline" onClick={() => onModuleChange('sh-r-reorder-suggestions')}>
              <Send className="h-4 w-4 mr-1" />Promote Reorder
            </Button>
            <Button variant="outline" onClick={() => onModuleChange('sh-t-receipt-ack')}>
              <ArrowRight className="h-4 w-4 mr-1" />Acknowledge Receipt
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
