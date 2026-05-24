/**
 * @file     ProcessGenealogyTracker.tsx
 * @sprint   T-Phase-3.PROD-3.5.PASS3 · ST11c
 * @purpose  Batch genealogy viewer + FDA 21 CFR Part 211 export.
 *           Q-LOCK-8 Option A · Full FDA export format.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Workflow, Download, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listProcessBatches } from '@/lib/process-batch-engine';
import {
  buildGenealogy,
  traceUpstream,
  traceDownstream,
  detectQualityImpact,
  exportFDAGenealogy,
} from '@/lib/process-genealogy-engine';
import type { ProcessBatch } from '@/types/process-batch';
import type { GenealogyTree, GenealogyNode } from '@/types/process-genealogy';

export function ProcessGenealogyTrackerPanel(): JSX.Element {
  const navigate = useNavigate();
  const { entityCode } = useEntityCode();
  const [batches, setBatches] = useState<ProcessBatch[]>([]);
  const [selectedBatchId, setSelectedBatchId] = useState('');
  const [tree, setTree] = useState<GenealogyTree | null>(null);
  const [upstream, setUpstream] = useState<GenealogyNode[]>([]);
  const [downstream, setDownstream] = useState<GenealogyNode[]>([]);

  useEffect(() => {
    if (!entityCode) return;
    setBatches(listProcessBatches(entityCode));
  }, [entityCode]);

  function handleBuild(): void {
    if (!selectedBatchId) {
      toast.error('Select a batch');
      return;
    }
    try {
      const t = buildGenealogy(entityCode, selectedBatchId);
      setTree(t);
      setUpstream(traceUpstream(t, selectedBatchId));
      setDownstream(traceDownstream(t, selectedBatchId));
      toast.success(`Genealogy built · ${Object.keys(t.nodes).length} nodes · ${t.edges.length} edges`);
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function handleExportFDA(): void {
    if (!tree) return;
    const batch = batches.find(b => b.id === selectedBatchId);
    if (!batch) return;
    try {
      const exp = exportFDAGenealogy(tree, {
        entityCode,
        facility_name: 'Operix Demo Plant',
        facility_registration_no: 'FDA-REG-DEMO-001',
        product_code: batch.batch_no.split('-')[0] ?? batch.batch_no,
        product_name: batch.recipe_name,
        manufacturing_date: batch.start_time?.slice(0, 10) ?? batch.created_at.slice(0, 10),
        expiry_date: '2027-01-01',
        released_by: 'QA Manager',
        released_at: batch.end_time ?? batch.updated_at,
        exported_by: 'current-user',
      });
      const blob = new Blob([JSON.stringify(exp, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `FDA-Genealogy-${batch.batch_no}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('FDA genealogy exported');
    } catch (e) {
      toast.error((e as Error).message);
    }
  }

  function handleRecallSimulation(): void {
    if (!tree || !selectedBatchId) return;
    const impact = detectQualityImpact(tree, selectedBatchId);
    toast.warning(`Recall impact: ${impact.length} downstream node(s) affected`);
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Workflow className="h-6 w-6 text-primary" />
        <h1 className="text-2xl font-semibold">Process Genealogy Tracker</h1>
        <Badge variant="outline">FDA 21 CFR Part 211 ready</Badge>
      </div>

      <Card>
        <CardHeader><CardTitle>Select Batch</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <Select value={selectedBatchId} onValueChange={setSelectedBatchId}>
            <SelectTrigger><SelectValue placeholder="Select batch..." /></SelectTrigger>
            <SelectContent>
              {batches.map(b => (
                <SelectItem key={b.id} value={b.id}>
                  {b.batch_no} · {b.recipe_name} · {b.status}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex gap-2">
            <Button onClick={handleBuild}>Build Genealogy</Button>
            {tree && (
              <>
                <Button variant="outline" onClick={handleExportFDA} className="gap-2">
                  <Download className="h-4 w-4" /> Export FDA
                </Button>
                <Button variant="outline" onClick={handleRecallSimulation} className="gap-2 text-warning">
                  <AlertTriangle className="h-4 w-4" /> Simulate Recall
                </Button>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {tree && (
        <div className="grid grid-cols-2 gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Upstream ({upstream.length} nodes)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">Raw materials + parent batches that went INTO this batch</p>
              <div className="space-y-1">
                {upstream.map(n => (
                  <div key={n.id} className="border rounded p-2 text-sm">
                    <Badge variant="outline" className="mr-2">{n.type}</Badge>
                    <strong>{n.item_name ?? n.id}</strong>
                    {n.vendor_lot_no && ` · lot ${n.vendor_lot_no}`}
                    {' · '}{n.qty} {n.uom}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Downstream ({downstream.length} nodes)</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-xs text-muted-foreground mb-2">Outputs + samples produced FROM this batch</p>
              <div className="space-y-1">
                {downstream.map(n => (
                  <div key={n.id} className="border rounded p-2 text-sm">
                    <Badge variant="outline" className="mr-2">{n.type}</Badge>
                    <strong>{n.item_name ?? n.id}</strong>
                    {' · '}{n.qty} {n.uom}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <Button variant="outline" onClick={() => navigate(-1)}>Back</Button>
    </div>
  );
}
