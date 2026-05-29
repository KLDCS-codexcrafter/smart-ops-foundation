/**
 * @file        src/pages/erp/comply360/home/TimeMachinePage.tsx
 * @purpose     Sprint 78b · Time-Machine sub-tab inside the home tab-shell (FR-106 recursive · Option B).
 *              Consumes comply360-time-machine-engine for point-in-time snapshot reconstruction.
 * @sprint      Sprint 78b · T-Phase-5.A.1.10-PASS-B · Block 5
 * @decisions   DP-S78-2 (Option B · home sub-tab) · FR-106
 */
import { useMemo, useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { History, GitCompare } from 'lucide-react';
import { toast } from 'sonner';
import {
  replaySnapshot,
  listAvailableSnapshots,
  compareSnapshots,
  type TimeMachineSnapshot,
} from '@/lib/comply360-time-machine-engine';

const ENTITIES = ['DEMO-CORP-01', 'ACME-PVT-LTD', 'BHARAT-AGRO-LLP'];
const ENTITY_TYPES = ['gstr-1', 'gstr-3b', 'gstr-9', 'tds-26q', 'form-3cd', 'aoc-4', 'mgt-7', 'epf-ecr', 'msme-form1', 'brsr-q'];

interface SampleSnapshot {
  entity_id: string;
  first_seen: string;
  last_modified: string;
}

const SAMPLE_SNAPSHOTS: SampleSnapshot[] = [
  { entity_id: 'GSTR1-2025-04-001', first_seen: '2025-05-01T10:12:00Z', last_modified: '2025-05-10T18:45:00Z' },
  { entity_id: 'GSTR1-2025-05-002', first_seen: '2025-06-01T09:30:00Z', last_modified: '2025-06-08T14:20:00Z' },
  { entity_id: 'GSTR3B-2025-04-001', first_seen: '2025-05-15T11:00:00Z', last_modified: '2025-05-19T16:00:00Z' },
];

function fmtTs(iso: string): string {
  const d = new Date(iso);
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  return `${String(d.getUTCDate()).padStart(2, '0')} ${months[d.getUTCMonth()]} ${d.getUTCFullYear()} · ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} IST`;
}

export default function TimeMachinePage(): JSX.Element {
  const [entity, setEntity] = useState<string>(ENTITIES[0]);
  const [entityType, setEntityType] = useState<string>(ENTITY_TYPES[0]);
  const [asOf, setAsOf] = useState<string>('2025-06-01');
  const [snapshot, setSnapshot] = useState<TimeMachineSnapshot | null>(null);
  const [snapshotB, setSnapshotB] = useState<TimeMachineSnapshot | null>(null);
  const [busy, setBusy] = useState<boolean>(false);

  const liveList = useMemo(
    () => listAvailableSnapshots(entity, entityType),
    [entity, entityType],
  );
  const displayList: SampleSnapshot[] = liveList.length > 0 ? liveList : SAMPLE_SNAPSHOTS;

  const onReplay = async (entity_id: string, slot: 'A' | 'B' = 'A'): Promise<void> => {
    setBusy(true);
    try {
      const snap = await replaySnapshot(entity, entityType, entity_id, asOf);
      if (slot === 'A') setSnapshot(snap);
      else setSnapshotB(snap);
      toast.success(`Reconstructed ${entity_id} as of ${asOf}`);
    } finally {
      setBusy(false);
    }
  };

  const diff = useMemo(() => {
    if (!snapshot || !snapshotB) return null;
    return compareSnapshots(snapshot, snapshotB);
  }, [snapshot, snapshotB]);

  return (
    <div className="p-4 max-w-7xl mx-auto space-y-4">
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
          <History className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1">
          <h1 className="text-xl font-bold">Time-Machine · Forensic Replay</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Reconstruct any statutory return / register at any prior point in time. Backed by audit-trail-aggregator (Rule 3(1) log + tamper-evident hash chain).
          </p>
        </div>
      </div>

      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div>
          <label className="text-[11px] font-medium block mb-1">Entity</label>
          <select className="text-xs bg-background border rounded-md px-2 py-1" value={entity} onChange={(e) => setEntity(e.target.value)}>
            {ENTITIES.map((x) => <option key={x} value={x}>{x}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1">Entity Type</label>
          <select className="text-xs bg-background border rounded-md px-2 py-1" value={entityType} onChange={(e) => setEntityType(e.target.value)}>
            {ENTITY_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
        <div>
          <label className="text-[11px] font-medium block mb-1">As of</label>
          <input
            type="date"
            className="text-xs bg-background border rounded-md px-2 py-1 font-mono"
            value={asOf}
            onChange={(e) => setAsOf(e.target.value)}
          />
        </div>
        <div className="ml-auto text-xs font-mono text-muted-foreground">
          {displayList.length} snapshot{displayList.length === 1 ? '' : 's'}
        </div>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="p-3 lg:col-span-1">
          <h3 className="text-sm font-semibold mb-2">Available Snapshots</h3>
          <div className="space-y-2">
            {displayList.map((s) => (
              <div key={s.entity_id} className="border rounded-md p-2 hover:bg-muted/20">
                <div className="font-mono text-xs">{s.entity_id}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">
                  First seen · {fmtTs(s.first_seen)}
                </div>
                <div className="text-[10px] text-muted-foreground">
                  Last modified · {fmtTs(s.last_modified)}
                </div>
                <div className="flex gap-1 mt-2">
                  <Button size="sm" variant="outline" disabled={busy} onClick={() => onReplay(s.entity_id, 'A')}>
                    Replay → A
                  </Button>
                  <Button size="sm" variant="ghost" disabled={busy} onClick={() => onReplay(s.entity_id, 'B')}>
                    Replay → B
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-3 lg:col-span-2 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <h4 className="text-xs font-semibold mb-1">Snapshot A</h4>
              {snapshot ? (
                <div className="text-[11px] space-y-1">
                  <div><span className="text-muted-foreground">Entity:</span> <span className="font-mono">{snapshot.entity_id}</span></div>
                  <div><span className="text-muted-foreground">As of:</span> <span className="font-mono">{snapshot.as_of}</span></div>
                  <div><span className="text-muted-foreground">Entries applied:</span> <span className="font-mono">{snapshot.entries_applied}</span></div>
                  <div>
                    <span className="text-muted-foreground">Chain verified:</span>{' '}
                    <span className={snapshot.chain_verified ? 'text-success' : 'text-warning'}>
                      {snapshot.chain_verified ? 'yes' : 'no'}
                    </span>
                  </div>
                  <pre className="bg-muted/30 rounded p-2 text-[10px] overflow-auto max-h-40">
                    {JSON.stringify(snapshot.reconstructed_state, null, 2) || 'null'}
                  </pre>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Pick a snapshot and click Replay → A.</p>
              )}
            </div>
            <div>
              <h4 className="text-xs font-semibold mb-1">Snapshot B</h4>
              {snapshotB ? (
                <div className="text-[11px] space-y-1">
                  <div><span className="text-muted-foreground">Entity:</span> <span className="font-mono">{snapshotB.entity_id}</span></div>
                  <div><span className="text-muted-foreground">As of:</span> <span className="font-mono">{snapshotB.as_of}</span></div>
                  <div><span className="text-muted-foreground">Entries applied:</span> <span className="font-mono">{snapshotB.entries_applied}</span></div>
                  <pre className="bg-muted/30 rounded p-2 text-[10px] overflow-auto max-h-40">
                    {JSON.stringify(snapshotB.reconstructed_state, null, 2) || 'null'}
                  </pre>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">Pick a second snapshot for diff.</p>
              )}
            </div>
          </div>

          {diff && (
            <div className="border-t pt-3">
              <div className="flex items-center gap-2 mb-1">
                <GitCompare className="h-4 w-4 text-primary" />
                <h4 className="text-xs font-semibold">Diff (A → B)</h4>
              </div>
              {diff.diff_keys.length === 0 ? (
                <p className="text-xs text-muted-foreground">No keys differ.</p>
              ) : (
                <ul className="text-[11px] font-mono list-disc list-inside text-warning">
                  {diff.diff_keys.map((k) => <li key={k}>{k}</li>)}
                </ul>
              )}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
