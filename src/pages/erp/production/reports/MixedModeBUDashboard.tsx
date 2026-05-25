/**
 * @file     MixedModeBUDashboard.tsx
 * @sprint   T-Phase-3.PROD-4.5 · Theme B
 * @purpose  Per-BU manufacturing-mode allocation for mixed_mode entities.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useEntityManufacturingMode } from '@/hooks/useEntityManufacturingMode';

interface BUAllocation {
  bu_id: string;
  bu_name: string;
  mode: 'discrete' | 'process' | 'repetitive';
  capacity_pct: number;
  utilization_pct: number;
}

// Demo allocation seed · in production reads from entity-setup-service
const DEMO_BUS: BUAllocation[] = [
  { bu_id: 'BU-01', bu_name: 'Assembly Discrete BU', mode: 'discrete', capacity_pct: 40, utilization_pct: 72 },
  { bu_id: 'BU-02', bu_name: 'Chemical Process BU', mode: 'process', capacity_pct: 35, utilization_pct: 81 },
  { bu_id: 'BU-03', bu_name: 'Packaging Repetitive BU', mode: 'repetitive', capacity_pct: 25, utilization_pct: 68 },
];

export default function MixedModeBUDashboard(): JSX.Element {
  const entityCode = useEntityCode();
  const mode = useEntityManufacturingMode();

  if (mode !== 'mixed_mode') {
    return (
      <div className="p-6">
        <Card>
          <CardHeader><CardTitle>Mixed-Mode BU Dashboard</CardTitle></CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              This dashboard is only available for entities configured as <span className="font-mono">mixed_mode</span>.
              Current entity mode: <span className="font-mono">{mode}</span>.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const total = DEMO_BUS.reduce((s, b) => s + b.capacity_pct, 0);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mixed-Mode BU Dashboard</h1>
        <p className="text-sm text-muted-foreground">Entity: <span className="font-mono">{entityCode}</span></p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {DEMO_BUS.map((bu) => (
          <Card key={bu.bu_id}>
            <CardHeader><CardTitle className="text-base">{bu.bu_name}</CardTitle></CardHeader>
            <CardContent>
              <Badge className="mb-3">{bu.mode}</Badge>
              <div className="text-sm space-y-1">
                <div>Capacity Share: <span className="font-mono">{bu.capacity_pct}%</span></div>
                <div>Utilization: <span className="font-mono">{bu.utilization_pct}%</span></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader><CardTitle>Allocation Summary</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>BU</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead className="font-mono">Capacity %</TableHead>
                <TableHead className="font-mono">Utilization %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {DEMO_BUS.map((bu) => (
                <TableRow key={bu.bu_id}>
                  <TableCell>{bu.bu_name}</TableCell>
                  <TableCell><Badge variant="secondary">{bu.mode}</Badge></TableCell>
                  <TableCell className="font-mono">{bu.capacity_pct}</TableCell>
                  <TableCell className="font-mono">{bu.utilization_pct}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-semibold">Total</TableCell>
                <TableCell />
                <TableCell className="font-mono font-semibold">{total}</TableCell>
                <TableCell />
              </TableRow>
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
