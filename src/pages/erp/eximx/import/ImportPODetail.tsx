/**
 * @file        src/pages/erp/eximx/import/ImportPODetail.tsx
 * @purpose     Import PO detail · lines · RateLadder timeline · 15CA/15CB flag
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 */
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Clock, FileWarning } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { getImportPO } from '@/lib/import-po-engine';
import { ImportPOLineageBreadcrumb } from './ImportPOLineageBreadcrumb';

export function ImportPODetail(): JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const po = entityCode ? getImportPO(entityCode, id) : null;

  if (!po) {
    return (
      <div>
        <Button variant="ghost" onClick={() => navigate('/erp/eximx/import/orders')}><ArrowLeft className="w-4 h-4 mr-2" /> Back</Button>
        <p className="mt-4">Import PO not found: {id}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/erp/eximx/import/orders')}><ArrowLeft className="w-4 h-4" /></Button>
        <div>
          <h1 className="text-2xl font-bold font-mono">{po.po_number}</h1>
          <div className="flex items-center gap-2 mt-1">
            <Badge>{po.status}</Badge>
            <Badge variant="outline">{po.currency_code} · @{po.booking_rate}</Badge>
            <Badge variant="outline">{po.incoterm}</Badge>
          </div>
        </div>
      </div>

      <ImportPOLineageBreadcrumb poNumber={po.po_number} />

      <Card>
        <CardHeader><CardTitle className="text-base">Lines ({po.lines.length})</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {po.lines.map((l) => (
            <div key={l.id} className="text-sm flex items-center gap-4 p-2 bg-muted/40 rounded">
              <span className="font-mono text-xs">{l.cth_code}</span>
              <Badge variant="outline">{l.country_of_origin}</Badge>
              {l.fta_agreement && <Badge>{l.fta_agreement}</Badge>}
              <span className="flex-1">{l.item_name}</span>
              <span className="font-mono text-xs">{l.qty} {l.uom} × {l.rate_foreign_currency}</span>
              <span className="font-mono text-xs">BCD {l.estimated_bcd_rate}%</span>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><Clock className="w-4 h-4" /> Rate Ladder ({po.rate_ladder.length} events · Moat #16)</CardTitle></CardHeader>
        <CardContent>
          {po.rate_ladder.length === 0 ? (
            <p className="text-sm text-muted-foreground">No rate events yet · ladder grows through PO → BoE → GRN → Payment</p>
          ) : (
            <div className="space-y-2">
              {po.rate_ladder.map((e) => (
                <div key={e.id} className="text-xs p-2 bg-muted/40 rounded">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{e.voucher_stage}</Badge>
                    <Badge>{e.rate_type}</Badge>
                    <span className="font-mono">@ {e.rate_value}</span>
                    <span className="text-muted-foreground">· {e.source}</span>
                  </div>
                  <div className="text-muted-foreground mt-1">{e.notes}</div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {po.form_15ca_seed.requires_form_15ca && (
        <Card className="border-l-4 border-l-warning">
          <CardContent className="p-3 text-sm flex items-center gap-2">
            <FileWarning className="w-4 h-4 text-warning" />
            <span>Form 15CA/15CB required at TT payment · v7 Compliance Gap #2 · workflow EX-8</span>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
