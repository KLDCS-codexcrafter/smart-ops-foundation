/**
 * SampleKits.tsx — Sprint 13c · Module ch-t-sample-kits
 * Out-of-box #5. Try-before-you-buy with 30-day return + auto-invoice.
 * Teal-500 accent.
 */

import { useEffect, useMemo, useState } from 'react';
import { PackageOpen, Send, RotateCcw, CheckCircle2, Truck, Sparkles, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

import { formatINR } from '@/lib/india-validations';
import {
  sampleKitTemplatesKey, sampleKitRequestsKey,
  type SampleKitTemplate, type SampleKitRequest, type SampleKitStatus,
  CONVERSION_WINDOW_DAYS,
} from '@/types/sample-kit';
import {
  checkEligibility, createRequest, daysRemainingInWindow,
  findExpiredRequests, transitionStatus,
} from '@/lib/sample-kit-engine';
import { logAudit } from '@/lib/card-audit-engine';

const ENTITY = 'SMRT';

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}
function setLs<T>(k: string, v: T[]): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

function getCurrentCustomerId(): string {
  try {
    const raw = localStorage.getItem('4ds_login_credential');
    if (!raw) return 'cust-demo';
    const p = JSON.parse(raw);
    return `cust-${p.value ?? 'demo'}`;
  } catch { return 'cust-demo'; }
}

function getCurrentCustomerName(id: string): string {
  try {
    const raw = localStorage.getItem('erp_group_customer_master');
    if (!raw) return id;
    const arr = JSON.parse(raw) as { id: string; legalName?: string; partyName?: string }[];
    const c = arr.find(x => x.id === id);
    return c?.legalName ?? c?.partyName ?? id;
  } catch { return id; }
}

const DEMO_TEMPLATES: SampleKitTemplate[] = [
  {
    id: 'skt-essentials',
    entity_id: ENTITY,
    code: 'KIT-ESS',
    name: 'Essentials Kit',
    description: 'Pantry basics — rice, atta, oil, sugar. Try our staples.',
    item_ids: ['itm-001', 'itm-003', 'itm-005', 'itm-011'],
    total_value_paise: 50000,
    max_kits_per_customer: 2,
    active: true,
  },
  {
    id: 'skt-premium',
    entity_id: ENTITY,
    code: 'KIT-PREM',
    name: 'Premium Tasting Kit',
    description: 'Curated premium SKUs across categories. Standard tier and above.',
    item_ids: ['itm-001', 'itm-004', 'itm-007', 'itm-008', 'itm-012'],
    total_value_paise: 150000,
    max_kits_per_customer: 1,
    min_clv_tier: 'standard',
    active: true,
  },
  {
    id: 'skt-vip',
    entity_id: ENTITY,
    code: 'KIT-VIP',
    name: 'VIP Tasting Experience',
    description: 'Full premium catalog sampler — exclusive to VIP customers.',
    item_ids: ['itm-001', 'itm-002', 'itm-004', 'itm-005', 'itm-006', 'itm-007', 'itm-009', 'itm-012'],
    total_value_paise: 500000,
    max_kits_per_customer: 1,
    min_clv_tier: 'vip',
    active: true,
  },
];

function statusBadgeClass(s: SampleKitStatus): string {
  switch (s) {
    case 'requested': return 'border-slate-500/30 text-slate-700 dark:text-slate-300';
    case 'approved':  return 'border-teal-500/30 text-teal-700 dark:text-teal-300';
    case 'shipped':   return 'border-violet-500/30 text-violet-700 dark:text-violet-300';
    case 'delivered': return 'border-emerald-500/30 text-emerald-700 dark:text-emerald-300';
    case 'returned':  return 'border-amber-500/30 text-amber-700 dark:text-amber-300';
    case 'converted': return 'border-teal-500/30 text-teal-700 dark:text-teal-300';
    case 'cancelled': return 'border-red-500/30 text-red-700 dark:text-red-300';
  }
}

export function SampleKitsPanel() {
  const customerId = getCurrentCustomerId();
  const customerName = useMemo(() => getCurrentCustomerName(customerId), [customerId]);

  const [templates, setTemplates] = useState<SampleKitTemplate[]>(
    () => ls<SampleKitTemplate>(sampleKitTemplatesKey(ENTITY)),
  );
  const [requests, setRequests] = useState<SampleKitRequest[]>(
    () => ls<SampleKitRequest>(sampleKitRequestsKey(ENTITY)),
  );
  const [tab, setTab] = useState<'browse' | 'mine'>('browse');

  // Seed demo templates + auto-convert expired requests on mount
  useEffect(() => {
    let nextTemplates = templates;
    if (templates.length === 0) {
      nextTemplates = DEMO_TEMPLATES;
      setLs(sampleKitTemplatesKey(ENTITY), DEMO_TEMPLATES);
      setTemplates(DEMO_TEMPLATES);
    }
    const expired = findExpiredRequests(requests);
    if (expired.length > 0) {
      const next = requests.map(r => {
        const exp = expired.find(e => e.id === r.id);
        if (!exp) return r;
        const tpl = nextTemplates.find(t => t.id === r.template_id);
        if (!tpl) return r;
        return transitionStatus(r, 'converted', tpl);
      });
      setRequests(next);
      setLs(sampleKitRequestsKey(ENTITY), next);
      toast.message(`${expired.length} kit(s) auto-converted (return window expired)`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myRequests = useMemo(
    () => requests
      .filter(r => r.customer_id === customerId)
      .sort((a, b) => b.requested_at.localeCompare(a.requested_at)),
    [requests, customerId],
  );

  // For demo, treat current customer as 'standard' tier unless overridden later.
  const myTier: 'vip' | 'growth' | 'standard' | 'at_risk' | 'churned' = 'standard';

  const handleRequest = (template: SampleKitTemplate) => {
    const elig = checkEligibility(template.id, customerId, templates, requests, myTier);
    if (!elig.ok) {
      toast.error(elig.reason ?? 'Not eligible');
      return;
    }
    const req = createRequest(template, customerId, customerName, ENTITY);
    const next = [...requests, req];
    setRequests(next);
    setLs(sampleKitRequestsKey(ENTITY), next);
    logAudit({
      entityCode: ENTITY, userId: customerId, userName: customerName,
      cardId: 'customer-hub', moduleId: 'ch-t-sample-kits',
      action: 'voucher_post',
      refType: 'sample_kit_request', refId: req.id,
      refLabel: `${template.name} requested`,
    });
    toast.success(`${template.name} requested`);
    setTab('mine');
  };

  const handleTransition = (req: SampleKitRequest, to: SampleKitStatus) => {
    const tpl = templates.find(t => t.id === req.template_id);
    if (!tpl) return;
    const updated = transitionStatus(req, to, tpl);
    const next = requests.map(r => r.id === req.id ? updated : r);
    setRequests(next);
    setLs(sampleKitRequestsKey(ENTITY), next);
    logAudit({
      entityCode: ENTITY, userId: customerId, userName: customerName,
      cardId: 'customer-hub', moduleId: 'ch-t-sample-kits',
      action: 'voucher_post',
      refType: 'sample_kit_request', refId: req.id,
      refLabel: `${tpl.name} → ${to}`,
    });
    toast.success(`Updated to ${to}`);
  };

  const eligibilityFor = (t: SampleKitTemplate): { ok: boolean; reason?: string } =>
    checkEligibility(t.id, customerId, templates, requests, myTier);

  return (
    <div className="space-y-4 animate-fade-in max-w-6xl">
      <header>
        <h1 className="text-xl font-bold flex items-center gap-2">
          <PackageOpen className="h-5 w-5 text-teal-500" />
          Sample Kits
        </h1>
        <p className="text-xs text-muted-foreground mt-0.5">
          Try before you buy · {CONVERSION_WINDOW_DAYS}-day return window · auto-invoice if kept
        </p>
      </header>

      <Tabs value={tab} onValueChange={(v) => setTab(v as 'browse' | 'mine')}>
        <TabsList>
          <TabsTrigger value="browse" className="text-xs">
            Browse Kits ({templates.filter(t => t.active).length})
          </TabsTrigger>
          <TabsTrigger value="mine" className="text-xs">
            My Requests ({myRequests.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {templates.filter(t => t.active).map(t => {
              const elig = eligibilityFor(t);
              return (
                <Card key={t.id} className="p-4 flex flex-col gap-2 hover:border-teal-500/40 transition-colors">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold leading-tight">{t.name}</p>
                      <p className="text-[10px] text-muted-foreground">{t.code}</p>
                    </div>
                    <Badge variant="outline" className="text-[9px] border-teal-500/30 text-teal-700 dark:text-teal-300 shrink-0">
                      {t.item_ids.length} items
                    </Badge>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-snug min-h-[2.5rem]">
                    {t.description}
                  </p>
                  <div className="flex items-center justify-between pt-1">
                    <p className="text-[11px]">
                      Total value if kept:{' '}
                      <span className="font-mono font-bold text-foreground">{formatINR(t.total_value_paise)}</span>
                    </p>
                    {t.min_clv_tier && (
                      <Badge variant="outline" className="text-[9px] uppercase border-violet-500/30 text-violet-700 dark:text-violet-300">
                        Min: {t.min_clv_tier}
                      </Badge>
                    )}
                  </div>
                  {elig.ok ? (
                    <Button
                      size="sm"
                      onClick={() => handleRequest(t)}
                      className="h-8 text-xs bg-teal-500 hover:bg-teal-600 text-white gap-1.5"
                    >
                      <Send className="h-3.5 w-3.5" /> Request kit
                    </Button>
                  ) : (
                    <Button size="sm" disabled className="h-8 text-xs">
                      Not eligible: {elig.reason}
                    </Button>
                  )}
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="mine" className="space-y-3">
          {myRequests.length === 0 ? (
            <Card className="p-8 text-center text-xs text-muted-foreground">
              No kit requests yet. Browse and request a kit to get started.
            </Card>
          ) : (
            <div className="space-y-2">
              {myRequests.map(r => {
                const tpl = templates.find(t => t.id === r.template_id);
                const days = daysRemainingInWindow(r);
                return (
                  <Card key={r.id} className="p-4 space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-sm font-bold">{r.template_name}</p>
                        <p className="text-[10px] text-muted-foreground">
                          Requested {new Date(r.requested_at).toLocaleString('en-IN', {
                            day: '2-digit', month: 'short', year: 'numeric',
                          })}
                        </p>
                      </div>
                      <Badge variant="outline" className={`text-[10px] capitalize ${statusBadgeClass(r.status)}`}>
                        {r.status}
                      </Badge>
                    </div>

                    {/* Timeline */}
                    <div className="flex items-center gap-1 text-[10px]">
                      {(['requested', 'shipped', 'delivered'] as const).map((s, i, arr) => {
                        const reached =
                          (s === 'requested') ||
                          (s === 'shipped' && !!r.shipped_at) ||
                          (s === 'delivered' && !!r.delivered_at);
                        return (
                          <span key={s} className="flex items-center gap-1">
                            <span className={reached ? 'text-teal-600 font-semibold' : 'text-muted-foreground'}>
                              {s}
                            </span>
                            {i < arr.length - 1 && <span className="text-muted-foreground">→</span>}
                          </span>
                        );
                      })}
                      <span className="text-muted-foreground">→</span>
                      <span className={r.status === 'returned' ? 'text-amber-600 font-semibold' : r.status === 'converted' ? 'text-teal-600 font-semibold' : 'text-muted-foreground'}>
                        {r.status === 'returned' ? 'returned' : r.status === 'converted' ? 'converted' : '…'}
                      </span>
                    </div>

                    {r.status === 'delivered' && days !== null && (
                      <div className={`text-[11px] flex items-center gap-1.5 rounded-md px-2 py-1 ${
                        days > 7 ? 'bg-teal-500/10 text-teal-700 dark:text-teal-300' :
                        days > 0 ? 'bg-amber-500/10 text-amber-700 dark:text-amber-300' :
                                   'bg-red-500/10 text-red-700 dark:text-red-300'
                      }`}>
                        <Clock className="h-3 w-3" />
                        {days > 0
                          ? `${days} day(s) remaining to return`
                          : 'Return window expired — auto-conversion pending'}
                      </div>
                    )}

                    {r.invoice_id && (
                      <div className="text-[11px] flex items-center gap-1.5 text-teal-700 dark:text-teal-300">
                        <Sparkles className="h-3 w-3" />
                        Invoiced as <span className="font-mono">{r.invoice_id}</span>{' '}
                        ({formatINR(r.converted_value_paise)})
                      </div>
                    )}

                    <div className="flex items-center gap-1.5 pt-1">
                      {r.status === 'requested' && tpl && (
                        <Button size="sm" variant="outline" onClick={() => handleTransition(r, 'approved')} className="h-7 text-[11px]">
                          Approve
                        </Button>
                      )}
                      {r.status === 'approved' && tpl && (
                        <Button size="sm" variant="outline" onClick={() => handleTransition(r, 'shipped')} className="h-7 text-[11px] gap-1">
                          <Truck className="h-3 w-3" /> Mark shipped
                        </Button>
                      )}
                      {r.status === 'shipped' && tpl && (
                        <Button size="sm" variant="outline" onClick={() => handleTransition(r, 'delivered')} className="h-7 text-[11px] gap-1">
                          <CheckCircle2 className="h-3 w-3" /> Mark delivered
                        </Button>
                      )}
                      {r.status === 'delivered' && days !== null && days > 0 && tpl && (
                        <Button
                          size="sm" variant="outline"
                          onClick={() => handleTransition(r, 'returned')}
                          className="h-7 text-[11px] gap-1 border-teal-500/40 text-teal-700 dark:text-teal-300"
                        >
                          <RotateCcw className="h-3 w-3" /> Return kit
                        </Button>
                      )}
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

export default SampleKitsPanel;
