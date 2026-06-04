/**
 * @file        src/pages/erp/taskflow/WorkDiaryPage.tsx
 * @purpose     S141 · Daily work diary · TF-31 · per-user activity for a date.
 * @sprint      Sprint 141 · T-TaskFlow-A641.5 · Block 4
 */
import { useCallback, useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { generateWorkDiary } from '@/lib/taskflow-accountability-engine';
import type { WorkDiaryEntry } from '@/types/taskflow';

export default function WorkDiaryPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const userId = user?.id ?? 'demo-user';
  const [dateISO, setDateISO] = useState(() => new Date().toISOString().slice(0, 10));
  const [entry, setEntry] = useState<WorkDiaryEntry | null>(null);

  const refresh = useCallback(() => {
    setEntry(generateWorkDiary(entityCode, userId, dateISO));
  }, [entityCode, userId, dateISO]);
  useEffect(() => { refresh(); }, [refresh]);

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      <div>
        <h1 className="text-2xl font-semibold">Work Diary</h1>
        <p className="text-sm text-muted-foreground">Auto-generated daily activity log.</p>
      </div>
      <Card className="rounded-2xl">
        <CardContent className="flex items-end gap-3 p-4">
          <div>
            <Label className="text-xs">Date</Label>
            <Input type="date" value={dateISO} onChange={(e) => setDateISO(e.target.value)} className="w-44" />
          </div>
          <Badge variant="outline" className="font-mono">{userId}</Badge>
        </CardContent>
      </Card>
      {entry && (
        <div className="grid md:grid-cols-2 gap-4">
          <Section title={`Created (${entry.created.length})`} rows={entry.created.map(t => `${t.code} · ${t.title}`)} />
          <Section title={`Acknowledged (${entry.acknowledged.length})`} rows={entry.acknowledged.map(t => `${t.code} · ${t.title}`)} />
          <Section title={`Completed (${entry.completed.length})`} rows={entry.completed.map(t => `${t.code} · ${t.title}`)} />
          <Section title={`Status changes (${entry.statusChanges.length})`} rows={entry.statusChanges.map(s => `${s.code}: ${s.from} → ${s.to}`)} />
          <Section title={`Went overdue (${entry.wentOverdue.length})`} rows={entry.wentOverdue.map(t => `${t.code} · ${t.title}`)} />
          <Card className="rounded-2xl">
            <CardHeader><CardTitle className="text-base">Comments posted</CardTitle></CardHeader>
            <CardContent><p className="text-3xl font-mono">{entry.commentsPosted}</p></CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function Section({ title, rows }: { title: string; rows: string[] }): JSX.Element {
  return (
    <Card className="rounded-2xl">
      <CardHeader><CardTitle className="text-base">{title}</CardTitle></CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nothing today.</p>
        ) : (
          <ul className="text-sm space-y-1 font-mono">
            {rows.map((r, i) => <li key={`${r}-${i}`}>· {r}</li>)}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
