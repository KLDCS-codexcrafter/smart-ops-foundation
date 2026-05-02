/**
 * PinnedTemplatesView · Sprint T-Phase-2.7-e · OOB-10 (Q4-d "View All")
 * Full list of pinned templates · search/filter/sort.
 */
import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, Search, Trash2, Edit2, Copy } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  searchPinnedTemplates,
  unpinTemplate,
  renameTemplate,
} from '@/lib/pinned-templates-engine';

export default function PinnedTemplatesView() {
  const { entityCode } = useEntityCode();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [vtFilter, setVtFilter] = useState<string>('all');
  const [tick, setTick] = useState(0);

  // tick is read by `all` derivation to force refresh after mutations
  const all = entityCode && tick >= 0 ? searchPinnedTemplates(entityCode, {}) : [];

  const voucherTypes = useMemo(() => {
    const set = new Map<string, string>();
    all.forEach((t) => set.set(t.voucher_type_id, t.voucher_type_name));
    return Array.from(set.entries());
  }, [all]);

  const filtered = useMemo(() => {
    if (!entityCode) return [];
    if (tick < 0) return [];
    return searchPinnedTemplates(entityCode, {
      voucher_type_id: vtFilter === 'all' ? undefined : vtFilter,
      query: query || undefined,
    });
  }, [entityCode, vtFilter, query, tick]);

  function handleUnpin(id: string) {
    if (!confirm('Unpin this template?')) return;
    if (unpinTemplate(entityCode, id)) {
      toast.success('Unpinned');
      setTick((n) => n + 1);
    }
  }

  function handleRename(id: string, current: string) {
    const next = prompt('New template name:', current);
    if (!next) return;
    if (renameTemplate(entityCode, id, next)) {
      toast.success('Renamed');
      setTick((n) => n + 1);
    }
  }

  function handleClone(id: string, voucherTypeId: string) {
    const ROUTES: Record<string, string> = {
      QUOTATION: '/erp/salesx/transactions/quotation',
      INVOICE: '/erp/salesx/transactions/invoice-memo',
      SECONDARY_SALES: '/erp/salesx/transactions/secondary-sales',
      SAMPLE_OUTWARD: '/erp/salesx/transactions/sample-outward',
      DEMO_OUTWARD: '/erp/salesx/transactions/demo-outward',
      SUPPLY_REQUEST: '/erp/salesx/transactions/supply-request',
      DELIVERY_MEMO: '/erp/dispatch/transactions/delivery-memo',
      GRN: '/erp/inventory/transactions/grn',
      MIN: '/erp/inventory/transactions/material-issue',
      CONSUMPTION: '/erp/inventory/transactions/consumption',
      CYCLE_COUNT: '/erp/inventory/transactions/cycle-count',
      RTV: '/erp/inventory/transactions/rtv',
    };
    const route = ROUTES[voucherTypeId];
    if (!route) {
      toast.error(`No route registered for ${voucherTypeId}`);
      return;
    }
    navigate(`${route}?from_template=${encodeURIComponent(id)}`);
  }

  return (
    <div className="space-y-4 p-6">
      <div className="flex items-center gap-2">
        <Pin className="h-5 w-5 text-indigo-500" />
        <h1 className="text-2xl font-bold">Pinned Templates</h1>
        <Badge variant="outline" className="font-mono">{filtered.length}</Badge>
      </div>

      <div className="flex gap-2 flex-wrap">
        <div className="relative flex-1 min-w-64">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by template or party name…"
            className="pl-8"
          />
        </div>
        <Select value={vtFilter} onValueChange={setVtFilter}>
          <SelectTrigger className="w-56">
            <SelectValue placeholder="All voucher types" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All voucher types</SelectItem>
            {voucherTypes.map(([id, name]) => (
              <SelectItem key={id} value={id}>{name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-xl">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Voucher Type</TableHead>
              <TableHead>Party</TableHead>
              <TableHead className="text-right">Lines</TableHead>
              <TableHead className="text-right">Use Count</TableHead>
              <TableHead>Last Used</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                  No pinned templates match.
                </TableCell>
              </TableRow>
            )}
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell className="font-medium">{t.template_name}</TableCell>
                <TableCell><Badge variant="outline">{t.voucher_type_name}</Badge></TableCell>
                <TableCell>{t.party_name ?? <span className="text-muted-foreground">—</span>}</TableCell>
                <TableCell className="text-right font-mono">{t.line_items.length}</TableCell>
                <TableCell className="text-right font-mono">{t.use_count}</TableCell>
                <TableCell className="font-mono text-xs">
                  {new Date(t.last_used_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex justify-end gap-1">
                    <Button size="icon" variant="ghost" onClick={() => handleClone(t.id, t.voucher_type_id)} title="Clone into new voucher">
                      <Copy className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleRename(t.id, t.template_name)} title="Rename">
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleUnpin(t.id)} title="Unpin">
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
