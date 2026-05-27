/**
 * @file        src/pages/erp/accounting/capital-assets/FAAuditTrailViewer.tsx
 * @purpose     UI viewer for fa-audit-trail-engine events · per-asset chronological
 * @reachable   Via FinCorePage switch case 'fc-fa-audit-trail' (wired Prompt C)
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { History, Plus } from 'lucide-react';
import { toast } from 'sonner';
import {
  getAuditTrail, recordRevaluation, type AuditTrailEvent,
} from '@/lib/fa-audit-trail-engine';

interface Props { entityCode: string }

const EVENT_TYPES: Array<AuditTrailEvent['event_type']> = [
  'creation', 'modification', 'verification', 'revaluation',
  'disposal', 'custodian_change', 'amc_renewal', 'maintenance',
];

export function FAAuditTrailViewerPanel({ entityCode }: Props): JSX.Element {
  const [assetId, setAssetId] = useState('');
  const [filter, setFilter] = useState<string>('all');
  const [tick, setTick] = useState(0);

  const trail = useMemo(() => {
    if (!assetId) return [];
    const all = getAuditTrail(entityCode, assetId);
    return filter === 'all' ? all : all.filter(e => e.event_type === filter);
  }, [entityCode, assetId, filter, tick]);

  const handleAddRevaluation = (): void => {
    if (!assetId) {
      toast.error('Select an asset first');
      return;
    }
    recordRevaluation(entityCode, assetId, {
      asset_unit_record_id: assetId,
      actor: 'current_user',
      old_book_value: 0,
      new_book_value: 0,
      revaluation_reserve_delta: 0,
      method: 'fair_value',
    });
    setTick(t => t + 1);
    toast.success('Revaluation event recorded');
  };

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center gap-2">
        <History className="h-5 w-5 text-primary" />
        <h2 className="text-lg font-semibold">FA Audit Trail Viewer</h2>
      </div>

      <Card>
        <CardContent className="pt-6 flex gap-2 items-end flex-wrap">
          <div className="flex-1 min-w-[200px]">
            <label className="text-xs text-muted-foreground">Asset ID</label>
            <Input value={assetId} onChange={e => setAssetId(e.target.value)} placeholder="e.g. PPE/25-26/001" />
          </div>
          <div className="w-48">
            <label className="text-xs text-muted-foreground">Filter event type</label>
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {EVENT_TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleAddRevaluation} variant="outline">
            <Plus className="h-4 w-4 mr-1" /> Add revaluation
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-sm">Timeline ({trail.length} events)</CardTitle></CardHeader>
        <CardContent className="space-y-2 max-h-[500px] overflow-auto">
          {trail.length === 0 ? (
            <p className="text-xs text-muted-foreground">No events. Enter an asset ID above.</p>
          ) : trail.map(e => (
            <div key={e.event_id} className="border-l-2 border-primary/30 pl-3 py-1 text-xs space-y-0.5">
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[9px]">{e.event_type}</Badge>
                <span className="font-mono text-muted-foreground">{e.timestamp.slice(0, 19)}</span>
                <span className="text-muted-foreground">· {e.actor}</span>
                {e.e_sig_hash && <Badge variant="default" className="text-[9px]">e-sig</Badge>}
              </div>
              {e.notes && <p className="text-muted-foreground">{e.notes}</p>}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
