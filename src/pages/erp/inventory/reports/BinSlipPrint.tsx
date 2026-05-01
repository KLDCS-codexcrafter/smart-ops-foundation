/**
 * BinSlipPrint.tsx — Bin Slip (label sheet) print panel
 * Sprint T-Phase-1.2.3 · Traceability + Storage Discipline
 *
 * Prints a 4×6 grid of bin-location labels for stick-on identification.
 * Filterable by godown · selects bins by status active.
 *
 * [JWT] GET /api/inventory/bin-labels?godown_id=
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Printer, MapPin, QrCode } from 'lucide-react';
import { useGodowns } from '@/hooks/useGodowns';
import { useBinLabels } from '@/hooks/useBinLabels';
import { PrintNarrationHeader } from '@/components/inventory-print/PrintNarrationHeader';

const LOCATION_TYPE_BG: Record<string, string> = {
  inward: 'bg-amber-100',
  qc: 'bg-rose-100',
  production: 'bg-violet-100',
  dispatch: 'bg-emerald-100',
  storage: 'bg-slate-100',
};

export function BinSlipPrintPanel() {
  const { godowns } = useGodowns();
  const { labels } = useBinLabels();

  const [godownId, setGodownId] = useState<string>('all');

  const filtered = useMemo(() => {
    const active = labels.filter(l => l.status === 'active');
    return godownId === 'all' ? active : active.filter(l => l.godown_id === godownId);
  }, [labels, godownId]);

  return (
    <div className="p-6 space-y-4">
      <div className="no-print flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <MapPin className="h-6 w-6 text-cyan-500" />
            Bin Slip (Label Sheet)
          </h2>
          <p className="text-sm text-muted-foreground">
            Stick-on labels for bin / rack / shelf identification · prints on plain A4
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={godownId} onValueChange={setGodownId}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Filter by godown" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Godowns</SelectItem>
              {godowns.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button
            disabled={filtered.length === 0}
            onClick={() => window.print()}
            className="gap-1.5"
          >
            <Printer className="h-4 w-4" /> Print {filtered.length} labels
          </Button>
        </div>
      </div>

      {filtered.length === 0 && (
        <Card className="no-print">
          <CardContent className="py-16 text-center text-sm text-muted-foreground">
            <MapPin className="h-12 w-12 mx-auto mb-3 opacity-30" />
            No active bin labels {godownId !== 'all' ? 'for this godown' : ''}.
            <div className="mt-2 text-xs">Create bin labels via Masters → Bin Labels.</div>
          </CardContent>
        </Card>
      )}

      {filtered.length > 0 && (
        <Card className="print-sheet bg-white text-black border-2 border-border max-w-[210mm] mx-auto">
          <CardHeader className="border-b-2 border-black no-print">
            <CardTitle className="text-lg">Bin Labels · {filtered.length} sticker(s)</CardTitle>
            <CardDescription className="text-black/70">
              Cut along the dashed lines. Use 70 gsm or sticker A4 sheet.
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <PrintNarrationHeader
              baseVoucherType="Stock Master"
              voucherTypeName="Bin Label Sheet"
              voucherNo={`${filtered.length} sticker(s)`}
              fallbackTitle="Bin Slip"
            />
            <div className="grid grid-cols-2 gap-2">
              {filtered.map(l => (
                <div
                  key={l.id}
                  className={`border-2 border-dashed border-black/40 p-3 ${LOCATION_TYPE_BG[l.location_type] || 'bg-slate-100'} text-black break-inside-avoid`}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="text-[9px] font-semibold uppercase tracking-wider text-black/60">
                        {l.godown_name}
                      </div>
                      <div className="text-xl font-mono font-extrabold tracking-tight leading-tight">
                        {l.location_code}
                      </div>
                    </div>
                    <QrCode className="h-12 w-12 text-black/80" />
                  </div>
                  <div className="grid grid-cols-4 gap-1 text-[9px] font-mono">
                    <div>
                      <div className="text-black/50">A</div>
                      <div className="font-bold">{l.aisle || '—'}</div>
                    </div>
                    <div>
                      <div className="text-black/50">R</div>
                      <div className="font-bold">{l.rack || '—'}</div>
                    </div>
                    <div>
                      <div className="text-black/50">S</div>
                      <div className="font-bold">{l.shelf || '—'}</div>
                    </div>
                    <div>
                      <div className="text-black/50">B</div>
                      <div className="font-bold">{l.bin || '—'}</div>
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <Badge variant="outline" className="text-[8px] px-1 py-0 h-4 border-black/40 text-black uppercase">
                      {l.location_type}
                    </Badge>
                    <span className="text-[8px] text-black/50 font-mono">{l.barcode_type}</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <style>{`
        @media print {
          .no-print { display: none !important; }
          body { background: white !important; }
          .print-sheet { box-shadow: none !important; border: none !important; }
          @page { size: A4; margin: 10mm; }
        }
      `}</style>
    </div>
  );
}
