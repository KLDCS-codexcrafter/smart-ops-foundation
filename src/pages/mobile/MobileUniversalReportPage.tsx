/**
 * @file        MobileUniversalReportPage.tsx
 * @sprint      Sprint AM.3 · T-AM3-Universal-Mobile · Pass 2
 * @purpose     Pick a back-office card → list its existing reports/KPIs · tap
 *              one to open the desktop surface (read-only).
 * @canon       READ-ONLY. Consumes `mobile-report-registry` only. No recompute,
 *              no fabricated metric, no new report logic. Honest banner up top.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, FileBarChart, AlertTriangle, ExternalLink } from 'lucide-react';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import {
  listMobileReports,
  listMobileReportCards,
  MOBILE_REPORT_HONESTY,
  type MobileReportCard,
} from '@/lib/mobile-report-registry';

const CARD_LABEL: Record<MobileReportCard, string> = {
  eximx: 'EximX',
  bill_passing: 'Bill-Passing',
  fpa: 'FP&A',
  accounting: 'Accounting',
  vendor_portal: 'Vendor-Portal',
  engineeringx: 'EngineeringX',
  fincore: 'FinCore',
};

export default function MobileUniversalReportPage(): JSX.Element {
  const navigate = useNavigate();
  const [card, setCard] = useState<MobileReportCard | null>(null);
  const cards = listMobileReportCards();
  const reports = card ? listMobileReports(card) : [];

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <OfflineIndicator />
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => (card ? setCard(null) : navigate('/operix-go'))}>
          <ArrowLeft className="h-4 w-4 mr-1" />{card ? 'Cards' : 'Back'}
        </Button>
        <h1 className="text-lg font-bold flex items-center gap-2">
          <FileBarChart className="h-5 w-5 text-primary" />
          {card ? CARD_LABEL[card] : 'Universal Reporting'}
        </h1>
        <div className="w-16" />
      </div>

      <Card className="p-3 border-amber-500/40 bg-amber-500/5">
        <div className="flex items-start gap-2 text-xs">
          <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-muted-foreground">{MOBILE_REPORT_HONESTY}</p>
        </div>
      </Card>

      {!card && (
        <div className="grid grid-cols-2 gap-3">
          {cards.map(c => (
            <button
              key={c}
              onClick={() => setCard(c)}
              className="rounded-2xl border bg-card/60 backdrop-blur-xl p-4 text-left hover:border-primary/40 transition-all"
            >
              <div className="font-semibold text-sm">{CARD_LABEL[c]}</div>
              <div className="text-xs text-muted-foreground mt-1 font-mono">
                {listMobileReports(c).length} report{listMobileReports(c).length === 1 ? '' : 's'}
              </div>
            </button>
          ))}
        </div>
      )}

      {card && (
        <div className="space-y-2">
          {reports.length === 0 ? (
            <p className="text-sm text-muted-foreground">No reports registered for this card.</p>
          ) : (
            reports.map(r => (
              <Card
                key={r.id}
                className="p-3 cursor-pointer hover:border-primary/40"
                onClick={() => navigate(r.desktopRoute)}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-medium text-sm">{r.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">{r.description}</div>
                    <div className="text-[10px] text-muted-foreground/70 mt-1 font-mono truncate">
                      {r.desktopRoute}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                    <Badge variant="outline" className="text-[10px]">{r.kind}</Badge>
                    <ExternalLink className="h-3 w-3 text-muted-foreground" />
                  </div>
                </div>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
}
