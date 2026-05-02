/**
 * PinnedTemplatesWidget · Sprint T-Phase-2.7-e · OOB-10
 * Dashboard tile · top 20 pins by recency.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Pin, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import {
  loadPinnedTemplatesForWidget,
  unpinTemplate,
} from '@/lib/pinned-templates-engine';
import type { PinnedTemplate } from '@/types/pinned-template';

interface Props {
  entityCode: string;
  className?: string;
}

const VOUCHER_ROUTE_MAP: Record<string, string> = {
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

function relativeTime(iso: string): string {
  const diff = Date.now() - Date.parse(iso);
  if (Number.isNaN(diff)) return '';
  const m = Math.floor(diff / 60000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  const mo = Math.floor(d / 30);
  return `${mo}mo ago`;
}

export function PinnedTemplatesWidget({ entityCode, className }: Props) {
  const navigate = useNavigate();
  const [tick, setTick] = useState(0);
  const templates: PinnedTemplate[] = entityCode
    ? loadPinnedTemplatesForWidget(entityCode)
    : [];

  function handleOpen(t: PinnedTemplate) {
    const route = VOUCHER_ROUTE_MAP[t.voucher_type_id];
    if (!route) {
      toast.error(`No route registered for ${t.voucher_type_id}`);
      return;
    }
    navigate(`${route}?from_template=${encodeURIComponent(t.id)}`);
  }

  function handleUnpin(e: React.MouseEvent, id: string) {
    e.stopPropagation();
    if (unpinTemplate(entityCode, id)) {
      toast.success('Template unpinned');
      setTick((n) => n + 1);
    }
  }

  // Force re-render via tick when needed (templates re-read each render)
  void tick;

  return (
    <div className={`rounded-2xl border border-border bg-card/60 backdrop-blur-xl p-4 ${className ?? ''}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Pin className="h-4 w-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-foreground">Pinned Templates</h3>
          <Badge variant="outline" className="text-[10px] font-mono">
            {templates.length}
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => navigate('/erp/finecore/pinned-templates')}
        >
          View All →
        </Button>
      </div>
      {templates.length === 0 ? (
        <p className="text-xs text-muted-foreground py-6 text-center">
          No pinned templates yet · pin from any voucher to save recurring patterns.
        </p>
      ) : (
        <div className="space-y-1 max-h-80 overflow-y-auto">
          {templates.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleOpen(t)}
              className="group w-full text-left flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-accent/40 transition-colors"
            >
              <div className="flex-1 min-w-0">
                <div className="text-sm font-medium truncate">{t.template_name}</div>
                <div className="text-xs text-muted-foreground truncate">
                  <span className="font-mono">{t.voucher_type_name}</span>
                  {t.party_name ? ` · ${t.party_name}` : ''}
                  {' · '}
                  <span className="font-mono">{t.use_count}×</span>
                  {' · '}
                  {relativeTime(t.last_used_at)}
                </div>
              </div>
              <span
                role="button"
                tabIndex={0}
                onClick={(e) => handleUnpin(e, t.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') handleUnpin(e as unknown as React.MouseEvent, t.id);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/10 transition-opacity"
                title="Unpin"
              >
                <X className="h-3.5 w-3.5 text-muted-foreground hover:text-destructive" />
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
