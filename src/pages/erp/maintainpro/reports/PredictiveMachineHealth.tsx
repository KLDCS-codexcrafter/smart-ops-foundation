/**
 * @file        src/pages/erp/maintainpro/reports/PredictiveMachineHealth.tsx
 * @purpose     Sprint 61 PROD-4 PASS 2 · MaintainPro AI & Predictive UI · CAP-25
 * @sprint      T-Phase-3.PROD-4 · PASS 2
 */
import { useState, useMemo, useEffect } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  predictMachineFailure,
  listMachineFailurePredictions,
  listMachinesByHealth,
} from '@/lib/iot-machine-bridge';
import type {
  MachineFailurePrediction,
  PredictionConfidence,
} from '@/lib/iot-machine-bridge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableHeader,
  TableRow,
  TableHead,
  TableBody,
  TableCell,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Activity, AlertTriangle, Zap } from 'lucide-react';
import { toast } from 'sonner';

type Horizon = 24 | 72 | 168;

export default function PredictiveMachineHealth(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [horizonHours, setHorizonHours] = useState<Horizon>(72);
  const [predictions, setPredictions] = useState<MachineFailurePrediction[]>([]);

  useEffect(() => {
    if (!entityCode) return;
    setPredictions(listMachineFailurePredictions(entityCode));
  }, [entityCode]);

  const handleRunPrediction = (machineId: string): void => {
    try {
      const prediction = predictMachineFailure(entityCode, machineId, horizonHours);
      setPredictions(listMachineFailurePredictions(entityCode));
      toast.success(`Prediction generated · confidence: ${prediction.confidence}`);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to generate prediction');
    }
  };

  const machinesByHealth = useMemo(
    () => (entityCode ? listMachinesByHealth(entityCode) : []),
    [entityCode],
  );

  const confidenceBadgeVariant = (c: PredictionConfidence) =>
    c === 'high' ? 'destructive' : c === 'medium' ? 'default' : 'secondary';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Predictive Machine Health · Sprint 61 PROD-4 · Capability #25
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">Prediction horizon:</label>
            <Select
              value={String(horizonHours)}
              onValueChange={(v) => setHorizonHours(parseInt(v, 10) as Horizon)}
            >
              <SelectTrigger className="w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="24">24 hours</SelectItem>
                <SelectItem value="72">72 hours (3 days)</SelectItem>
                <SelectItem value="168">168 hours (1 week)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Machine Health Status</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Machine ID</TableHead>
                <TableHead>Health Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Last Telemetry</TableHead>
                <TableHead>Recent Breaches</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {machinesByHealth.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-xs text-muted-foreground py-6"
                  >
                    No machines with telemetry data. Ingest telemetry via IoT bridge first.
                  </TableCell>
                </TableRow>
              ) : (
                machinesByHealth.map((h) => (
                  <TableRow key={h.machine_id}>
                    <TableCell className="font-mono text-xs">{h.machine_id}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          h.score >= 80 ? 'secondary' : h.score >= 50 ? 'default' : 'destructive'
                        }
                      >
                        {h.score}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          h.status === 'healthy'
                            ? 'secondary'
                            : h.status === 'degraded'
                              ? 'default'
                              : 'destructive'
                        }
                      >
                        {h.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{h.last_telemetry_at ?? '—'}</TableCell>
                    <TableCell className="text-xs text-center">{h.recent_breach_count}</TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleRunPrediction(h.machine_id)}
                      >
                        <Zap className="h-3 w-3 mr-1" />
                        Predict
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <AlertTriangle className="h-4 w-4" />
            Recent Failure Predictions ({predictions.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {predictions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No predictions generated yet. Click &quot;Predict&quot; on a machine above.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Machine</TableHead>
                  <TableHead>Confidence</TableHead>
                  <TableHead>Predicted Failure At</TableHead>
                  <TableHead>Horizon</TableHead>
                  <TableHead>Contributing Parameters</TableHead>
                  <TableHead>Generated</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {predictions.slice(0, 20).map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs">{p.machine_id}</TableCell>
                    <TableCell>
                      <Badge variant={confidenceBadgeVariant(p.confidence)}>{p.confidence}</Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(p.predicted_failure_at).toLocaleString()}
                    </TableCell>
                    <TableCell className="text-xs">{p.prediction_horizon_hours}h</TableCell>
                    <TableCell className="text-xs">
                      {p.contributing_parameters.length === 0 ? (
                        <span className="text-muted-foreground">none</span>
                      ) : (
                        p.contributing_parameters.map((c) => (
                          <span key={c.parameter} className="mr-2">
                            <Badge
                              variant={c.severity === 'critical' ? 'destructive' : 'default'}
                              className="text-xs"
                            >
                              {c.parameter}
                            </Badge>
                          </span>
                        ))
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {new Date(p.generated_at).toLocaleString()}
                    </TableCell>
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
