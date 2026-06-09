/**
 * @file        src/pages/erp/vendor-portal/panels/VendorComplianceChecklistsPanel.tsx
 * @purpose     Per-vendor compliance checklist · built from vendor-compliance-record (CONSUMES)
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { ListChecks, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  buildComplianceChecklist, listComplianceChecklists,
} from '@/lib/vendor-risk-compliance-engine';
import type { VendorComplianceChecklist } from '@/types/vendor-compliance-checklist';

export function VendorComplianceChecklistsPanel(): JSX.Element {
  const entityCode = useMemo(() => {
    try { return localStorage.getItem('active_entity_code') ?? DEFAULT_ENTITY_SHORTCODE; }
    catch { return DEFAULT_ENTITY_SHORTCODE; }
  }, []);
  const [vendorId, setVendorId] = useState('');
  const [lists, setLists] = useState<VendorComplianceChecklist[]>(() => listComplianceChecklists(entityCode));

  const build = (): void => {
    if (!vendorId) { toast.error('Vendor ID required'); return; }
    buildComplianceChecklist(entityCode, vendorId);
    setLists(listComplianceChecklists(entityCode));
    toast.success('Checklist (re)built from compliance records');
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-emerald-500/15 flex items-center justify-center">
          <ListChecks className="h-6 w-6 text-emerald-600" />
        </div>
        <div>
          <h1 className="text-2xl font-semibold">Compliance Checklists</h1>
          <p className="text-sm text-muted-foreground">Built from <code>vendor-compliance-record</code> · per-item status mirrored from verification_status</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle>Build Checklist</CardTitle></CardHeader>
        <CardContent className="flex gap-2">
          <Input placeholder="Vendor party_id" value={vendorId} onChange={e => setVendorId(e.target.value)} />
          <Button onClick={build}><RefreshCw className="h-4 w-4 mr-1" /> Build</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle>Checklists ({lists.length})</CardTitle></CardHeader>
        <CardContent>
          {lists.length === 0 ? (
            <p className="text-sm text-muted-foreground">No checklists yet.</p>
          ) : (
            <div className="space-y-3">
              {lists.map(c => (
                <div key={c.id} className="rounded-md border p-3">
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span>Vendor: <span className="font-mono">{c.vendor_id}</span></span>
                    <Badge>{c.overall_status}</Badge>
                  </div>
                  <ul className="mt-2 space-y-1 text-xs">
                    {c.items.map((it, idx) => (
                      <li key={`${c.id}-${idx}`} className="flex items-center justify-between">
                        <span>{it.required ? '★ ' : ''}{it.label}</span>
                        <Badge variant="outline">{it.status}</Badge>
                      </li>
                    ))}
                    {c.items.length === 0 && <li className="text-muted-foreground">No compliance records on file.</li>}
                  </ul>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
