/**
 * CreditUtilReport.tsx — Credit utilisation across distributors
 * Each row: distributor name · limit · outstanding · utilisation % · grade
 * Sort by utilisation desc. Highlight > 80% in red.
 * Module id: dh-r-credit-util
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { distributorsKey, type Distributor } from '@/types/distributor';
import { ratingsKey, type RatingEntry } from '@/types/distributor-rating';
import { computeComposite } from '@/lib/distributor-rating-engine';
import { formatINR } from '@/lib/india-validations';

const ENTITY = 'SMRT';

function readList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

export function CreditUtilReportPanel() {
  const rows = useMemo(() => {
    // [JWT] GET /api/reports/distributor-credit-util
    const list = readList<Distributor>(distributorsKey(ENTITY));
    const ratings = readList<RatingEntry>(ratingsKey(ENTITY));
    return list.map(d => {
      const lim = d.credit_limit_paise ?? 0;
      const out = d.outstanding_paise ?? 0;
      const util = lim > 0 ? Math.round((out / lim) * 100) : 0;
      const score = computeComposite(d.id, ratings);
      return { d, util, score };
    }).sort((a, b) => b.util - a.util);
  }, []);

  const overall = rows.reduce((acc, r) => ({
    totalLim: acc.totalLim + (r.d.credit_limit_paise ?? 0),
    totalOut: acc.totalOut + (r.d.outstanding_paise ?? 0),
  }), { totalLim: 0, totalOut: 0 });

  const pct = overall.totalLim > 0 ? Math.round((overall.totalOut / overall.totalLim) * 100) : 0;
  const pctColour = pct > 80 ? 'text-red-600' : pct > 60 ? 'text-amber-600' : 'text-emerald-600';

  return (
    <div className="p-4 md:p-6 space-y-4 animate-fade-in">
      <div>
        <h2 className="text-xl font-bold">Credit Utilisation</h2>
        <p className="text-sm text-muted-foreground">Limit, outstanding and grade per distributor.</p>
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Total limit</span>
          <p className="text-xl font-bold font-mono">{formatINR(overall.totalLim)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Total outstanding</span>
          <p className="text-xl font-bold font-mono">{formatINR(overall.totalOut)}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <span className="text-xs text-muted-foreground">Utilisation</span>
          <p className={`text-xl font-bold font-mono ${pctColour}`}>{pct}%</p>
        </CardContent></Card>
      </div>
      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead className="bg-muted/30 text-xs">
              <tr>
                <th className="text-left p-2">Distributor</th>
                <th className="text-right p-2">Limit</th>
                <th className="text-right p-2">Outstanding</th>
                <th className="text-right p-2">Util %</th>
                <th className="text-center p-2">Grade</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(r => {
                const colour = r.util > 80
                  ? 'text-red-600'
                  : r.util > 60
                  ? 'text-amber-600'
                  : 'text-emerald-600';
                return (
                  <tr key={r.d.id} className="border-t">
                    <td className="p-2">{r.d.legal_name}</td>
                    <td className="p-2 text-right font-mono">{formatINR(r.d.credit_limit_paise ?? 0)}</td>
                    <td className="p-2 text-right font-mono">{formatINR(r.d.outstanding_paise ?? 0)}</td>
                    <td className={`p-2 text-right font-semibold font-mono ${colour}`}>{r.util}%</td>
                    <td className="p-2 text-center font-mono">{r.score.credit_grade}</td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr><td colSpan={5} className="p-4 text-center text-muted-foreground">
                  No distributors yet
                </td></tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}

export default CreditUtilReportPanel;
