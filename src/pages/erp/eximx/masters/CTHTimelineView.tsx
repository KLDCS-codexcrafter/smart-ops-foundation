/**
 * @file        src/pages/erp/eximx/masters/CTHTimelineView.tsx
 * @purpose     D-NEW-EZ · CTH history granular timeline visual
 * @sprint      T-Phase-2.B-1-EximX-LightDNEWs
 */
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { buildTimelineForCTH, timelineSummary, type CTHTimelineEvent } from '@/lib/cth-timeline-helper';

export function CTHTimelineView({
  cthCode,
  countryCode,
  onClose,
}: {
  cthCode: string;
  countryCode: string;
  onClose: () => void;
}): JSX.Element {
  const { entityCode } = useEntityCode();
  const events: CTHTimelineEvent[] = entityCode
    ? buildTimelineForCTH(entityCode, cthCode, countryCode)
    : [];
  const summary = timelineSummary(events);

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            CTH History Timeline · {cthCode}
            {countryCode && ` · ${countryCode}`}
          </DialogTitle>
        </DialogHeader>
        <div className="flex gap-2 mb-2">
          <Badge>{summary.total_events} events</Badge>
          {summary.latest_event_date && (
            <Badge variant="secondary">Latest: {summary.latest_event_date}</Badge>
          )}
        </div>
        {events.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No history events found for this CTH{countryCode ? ' × Country' : ''} combination.
          </p>
        ) : (
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {events.map((e, idx) => (
              <Card key={`${e.date}-${e.event_type}-${idx}`}>
                <CardContent className="p-3 text-xs space-y-1">
                  <div className="flex justify-between items-center">
                    <Badge variant="outline">{e.event_type}</Badge>
                    <span className="text-muted-foreground font-mono">{e.date}</span>
                  </div>
                  <p>
                    <strong>{e.before_value}</strong> → <strong>{e.after_value}</strong>
                    {e.country_code && (
                      <span className="ml-2 text-muted-foreground">({e.country_code})</span>
                    )}
                  </p>
                  {e.reason && <p className="text-muted-foreground">{e.reason}</p>}
                  {e.recorded_by && <p className="text-muted-foreground italic">by {e.recorded_by}</p>}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
