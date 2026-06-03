/**
 * @file        src/features/insightx-insights-inbox/InsightsInboxPage.tsx
 * @page        First-Class Standalone Page #62 · Insights Inbox (proactive · the insight finds you).
 * @sprint      Sprint 134 · T-Phase-7.D.3.5 · 🌟 Arc D.3 · #4 TOP-1%
 * @decisions   Reads ONLY insights-inbox-engine. Renders impact-ranked items
 *              with risk/opportunity/anomaly badges, root_cause, and
 *              recommended_action. NOT a sibling. Registered as InsightXModule
 *              'ix-insights-inbox' under the InsightX shell (NOT CC).
 */
import { useMemo, useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Inbox, RefreshCw, AlertTriangle, Sparkles, Activity } from 'lucide-react';
import {
  buildInbox,
  type InboxItem,
  type InboxCategory,
} from '@/lib/insights-inbox-engine';

const CATEGORY_TONE: Record<InboxCategory, string> = {
  risk:        'bg-destructive/10 text-destructive border-destructive/30',
  opportunity: 'bg-success/10 text-success border-success/30',
  anomaly:     'bg-warning/10 text-warning border-warning/30',
};

const CATEGORY_ICON: Record<InboxCategory, React.ReactNode> = {
  risk:        <AlertTriangle className="h-3.5 w-3.5" />,
  opportunity: <Sparkles className="h-3.5 w-3.5" />,
  anomaly:     <Activity className="h-3.5 w-3.5" />,
};

export default function InsightsInboxPage() {
  const [fy, setFy] = useState('FY26-27');
  const [topN, setTopN] = useState<number>(10);
  const [entityCode, setEntityCode] = useState<string>('OPX');
  const [items, setItems] = useState<InboxItem[]>([]);
  const [filter, setFilter] = useState<InboxCategory | 'all'>('all');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const visible = useMemo(() => {
    if (filter === 'all') return items;
    return items.filter((it) => it.category === filter);
  }, [items, filter]);

  const counts = useMemo(() => {
    const acc: Record<InboxCategory | 'all', number> = {
      all: items.length, risk: 0, opportunity: 0, anomaly: 0,
    };
    for (const it of items) acc[it.category]++;
    return acc;
  }, [items]);

  const handleRefresh = () => {
    try {
      setErrorMsg(null);
      const next = buildInbox({ fy, top_n: topN, entity_code: entityCode });
      setItems(next);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : 'Failed to build inbox');
      setItems([]);
    }
  };

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-3">
          <Inbox className="h-6 w-6 text-primary" />
          <h1 className="text-2xl font-semibold">Insights Inbox</h1>
          <Badge variant="outline" className="gap-1">
            <Sparkles className="h-3 w-3" /> Proactive · impact-ranked
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground max-w-3xl">
          The insight finds you. Aggregates the alert engines, the latest narratives,
          the Operix Score, and the cross-card drill — each item ships with a
          <span className="font-medium text-foreground"> root cause</span> and a
          <span className="font-medium text-foreground"> recommended action</span>.
        </p>
      </div>

      <Card className="glass-card">
        <CardHeader>
          <CardTitle className="text-base">Inbox controls</CardTitle>
          <CardDescription>
            Reads <span className="font-mono">insights-inbox-engine</span> · all source
            engines stay 0-DIFF (FR-44 aggregate-don&apos;t-recompute).
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
          <div className="space-y-1">
            <Label>Financial year</Label>
            <Input value={fy} onChange={(e) => setFy(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Entity code</Label>
            <Input value={entityCode} onChange={(e) => setEntityCode(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Top N</Label>
            <Input
              type="number"
              min={1}
              max={50}
              value={topN}
              onChange={(e) => setTopN(Math.max(1, Math.min(50, Number(e.target.value) || 10)))}
            />
          </div>
          <Button onClick={handleRefresh} className="gap-2">
            <RefreshCw className="h-4 w-4" /> Build inbox
          </Button>
        </CardContent>
      </Card>

      {errorMsg && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMsg}
        </div>
      )}

      <Card className="glass-card">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Top-ranked items</CardTitle>
            <CardDescription>
              {items.length === 0
                ? 'No items yet — click "Build inbox" to aggregate signals.'
                : `${visible.length} of ${items.length} item(s) · ranked by impact desc.`}
            </CardDescription>
          </div>
          <div className="w-56">
            <Select value={filter} onValueChange={(v) => setFilter(v as InboxCategory | 'all')}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All ({counts.all})</SelectItem>
                <SelectItem value="risk">Risk ({counts.risk})</SelectItem>
                <SelectItem value="opportunity">Opportunity ({counts.opportunity})</SelectItem>
                <SelectItem value="anomaly">Anomaly ({counts.anomaly})</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {visible.length === 0 ? (
            <div className="text-sm text-muted-foreground py-8 text-center">
              Inbox is empty for the current filter.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Category</TableHead>
                  <TableHead>Item</TableHead>
                  <TableHead className="text-right">Impact</TableHead>
                  <TableHead>Root cause</TableHead>
                  <TableHead>Recommended action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {visible.map((it) => (
                  <TableRow key={it.item_id}>
                    <TableCell>
                      <Badge variant="outline" className={`gap-1 ${CATEGORY_TONE[it.category]}`}>
                        {CATEGORY_ICON[it.category]}
                        {it.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{it.title}</div>
                      <div className="text-xs text-muted-foreground font-mono">
                        {it.source_engine}
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-mono">{it.impact_score}</TableCell>
                    <TableCell className="max-w-md">
                      <div className="text-sm">{it.root_cause}</div>
                      {it.note && (
                        <div className="text-xs text-muted-foreground mt-1">{it.note}</div>
                      )}
                    </TableCell>
                    <TableCell className="max-w-md text-sm">{it.recommended_action}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
