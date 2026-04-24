/**
 * @file     PendingActionsList.tsx
 * @purpose  Surface time-sensitive items needing admin action:
 *           draft opening balances, unresolved import errors, pending credit requests.
 *           Read-only admin inbox — clicks deep-link to the source.
 * @sprint   T-H1.5-C-S2
 * @finding  CC-009
 */
import { AlertCircle, ArrowRight } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';

interface PendingAction {
  id: string;
  label: string;
  source: string;
  deep_link: string;
  count: number;
}

function readPendingActions(entityCode: string): PendingAction[] {
  const actions: PendingAction[] = [];

  // Opening ledger balance drafts
  try {
    // [JWT] GET /api/opening-balances/drafts
    const raw = localStorage.getItem('erp_opening_ledger_drafts');
    if (raw) {
      const parsed = JSON.parse(raw);
      const count = Array.isArray(parsed) ? parsed.length : 0;
      if (count > 0) {
        actions.push({
          id: 'ob-drafts',
          label: `${count} opening-balance draft${count > 1 ? 's' : ''} awaiting post`,
          source: 'Opening Balances',
          deep_link: '/command-center#opening-ledger-balances',
          count,
        });
      }
    }
  } catch { /* ignore */ }

  // Credit requests (distributor)
  try {
    // [JWT] GET /api/distributor/credit-requests
    const raw = localStorage.getItem(`erp_credit_increase_requests_${entityCode}`);
    if (raw) {
      const parsed = JSON.parse(raw);
      const pending = Array.isArray(parsed) ? parsed.filter((r: { status?: string }) => r.status === 'pending').length : 0;
      if (pending > 0) {
        actions.push({
          id: 'credit-requests',
          label: `${pending} distributor credit request${pending > 1 ? 's' : ''} awaiting review`,
          source: 'Distributor Hub',
          deep_link: '/erp/distributor-hub/credit-approval',
          count: pending,
        });
      }
    }
  } catch { /* ignore */ }

  // Import errors (if Import Hub ever writes error log)
  try {
    // [JWT] GET /api/import-hub/errors
    const raw = localStorage.getItem('erp_import_hub_errors');
    if (raw) {
      const parsed = JSON.parse(raw);
      const count = Array.isArray(parsed) ? parsed.length : 0;
      if (count > 0) {
        actions.push({
          id: 'import-errors',
          label: `${count} unresolved import error${count > 1 ? 's' : ''}`,
          source: 'Import Hub',
          deep_link: '/command-center#utility-import',
          count,
        });
      }
    }
  } catch { /* ignore */ }

  return actions;
}

export function PendingActionsList() {
  const { entityCode } = useEntityCode();
  const actions = entityCode ? readPendingActions(entityCode) : [];

  if (actions.length === 0) {
    return null; // hide card entirely when nothing pending
  }

  return (
    <div className="glass-card rounded-2xl p-4 border-amber-500/30 border">
      <div className="flex items-center gap-2 mb-3">
        <AlertCircle className="h-4 w-4 text-amber-500" />
        <p className="text-xs font-semibold text-foreground uppercase tracking-wider">Pending Actions</p>
      </div>
      <ul className="space-y-2">
        {actions.map(a => (
          <li key={a.id} className="flex items-center justify-between gap-3 text-xs">
            <div className="min-w-0">
              <p className="text-foreground truncate">{a.label}</p>
              <p className="text-[10px] text-muted-foreground">{a.source}</p>
            </div>
            <a href={a.deep_link} className="text-primary hover:underline flex items-center gap-1 shrink-0">
              Review <ArrowRight className="h-3 w-3" />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
