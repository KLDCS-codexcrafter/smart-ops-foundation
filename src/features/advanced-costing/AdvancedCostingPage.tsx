/**
 * @file        src/features/advanced-costing/AdvancedCostingPage.tsx
 * @page        Standalone Page #51 · Advanced Costing (under FP&A self-owned shell)
 * @sprint      Sprint 125 · T-Phase-7.D.1.6 · Block 4 · 🏁 Arc D.1 Capstone
 * @reads-from  advanced-costing-engine (only)
 * @scope       Job · Process · ABC · CVP/break-even — management-decision costing
 */
import { useState } from 'react';
import {
  Card, CardContent, CardHeader, CardTitle, CardDescription,
} from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Calculator, Factory, Activity, TrendingUp } from 'lucide-react';
import {
  computeJobCost,
  computeProcessCost,
  computeABC,
  computeCVP,
  listJobCosts,
  listProcessCosts,
  type JobCost,
  type ProcessCost,
  type ABCResult,
  type CVPResult,
} from '@/lib/advanced-costing-engine';

function INR(n: number): string {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 2 }).format(n);
}

function PCT(n: number): string {
  return `${(n * 100).toFixed(2)}%`;
}

export default function AdvancedCostingPage() {
  return (
    <div className="min-h-full bg-background p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8 animate-fade-in">
        <header className="space-y-2">
          <div className="flex items-center gap-3">
            <Calculator className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-semibold">Advanced Costing</h1>
            <Badge variant="outline" className="ml-2">S125 · 🏁 Arc D.1</Badge>
            <Badge variant="secondary">Page #51</Badge>
          </div>
          <p className="text-muted-foreground max-w-3xl">
            Management-decision costing — job, process, activity-based, and CVP /
            break-even analysis. Reads the S124 operational-costing standard-cost
            base; distinct from statutory cost-audit (§148 · FR-44 walls).
          </p>
        </header>

        <Tabs defaultValue="job">
          <TabsList className="grid grid-cols-4 max-w-2xl">
            <TabsTrigger value="job"><Factory className="h-4 w-4 mr-2" />Job</TabsTrigger>
            <TabsTrigger value="process"><Activity className="h-4 w-4 mr-2" />Process</TabsTrigger>
            <TabsTrigger value="abc"><Calculator className="h-4 w-4 mr-2" />ABC</TabsTrigger>
            <TabsTrigger value="cvp"><TrendingUp className="h-4 w-4 mr-2" />CVP</TabsTrigger>
          </TabsList>

          <TabsContent value="job"><JobPanel /></TabsContent>
          <TabsContent value="process"><ProcessPanel /></TabsContent>
          <TabsContent value="abc"><ABCPanel /></TabsContent>
          <TabsContent value="cvp"><CVPPanel /></TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

// ─── Job ─────────────────────────────────────────────────────────────────────

function JobPanel() {
  const [jobId, setJobId] = useState('JOB-001');
  const [dm, setDm] = useState(50000);
  const [dl, setDl] = useState(20000);
  const [oh, setOh] = useState(15000);
  const [units, setUnits] = useState(100);
  const [stdKey, setStdKey] = useState('');
  const [result, setResult] = useState<JobCost | null>(null);
  const [jobs, setJobs] = useState<JobCost[]>(listJobCosts());

  const run = () => {
    const r = computeJobCost({
      job_id: jobId,
      direct_material: Number(dm),
      direct_labour: Number(dl),
      overhead_applied: Number(oh),
      units: Number(units),
      standard_item_key: stdKey || undefined,
    });
    setResult(r);
    setJobs(listJobCosts());
  };

  return (
    <Card className="glass-card mt-4">
      <CardHeader>
        <CardTitle>Job Costing</CardTitle>
        <CardDescription>Direct Material + Direct Labour + Applied Overhead → cost / unit</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label htmlFor="job-id">Job ID</Label><Input id="job-id" value={jobId} onChange={(e) => setJobId(e.target.value)} /></div>
          <div><Label htmlFor="job-dm">Direct Material</Label><Input id="job-dm" type="number" value={dm} onChange={(e) => setDm(Number(e.target.value))} /></div>
          <div><Label htmlFor="job-dl">Direct Labour</Label><Input id="job-dl" type="number" value={dl} onChange={(e) => setDl(Number(e.target.value))} /></div>
          <div><Label htmlFor="job-oh">Overhead Applied</Label><Input id="job-oh" type="number" value={oh} onChange={(e) => setOh(Number(e.target.value))} /></div>
          <div><Label htmlFor="job-u">Units</Label><Input id="job-u" type="number" value={units} onChange={(e) => setUnits(Number(e.target.value))} /></div>
          <div><Label htmlFor="job-sk">Std item_key (S124)</Label><Input id="job-sk" value={stdKey} onChange={(e) => setStdKey(e.target.value)} placeholder="optional" /></div>
        </div>
        <Button onClick={run}>Compute Job Cost</Button>
        {result && (
          <div className="font-mono text-sm border border-border rounded-lg p-4 space-y-1">
            <div>Total Cost: <span className="text-primary">{INR(result.total_cost)}</span></div>
            <div>Cost / Unit: <span className="text-primary">{INR(result.cost_per_unit)}</span></div>
            <div>Standard base / unit (S124): <span className="text-muted-foreground">{result.standard_base_per_unit !== null ? INR(result.standard_base_per_unit) : '—'}</span></div>
          </div>
        )}
        {jobs.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Job</TableHead><TableHead className="text-right">Total</TableHead><TableHead className="text-right">/Unit</TableHead></TableRow></TableHeader>
            <TableBody>{jobs.map((j) => (<TableRow key={j.job_id}><TableCell className="font-mono">{j.job_id}</TableCell><TableCell className="text-right font-mono">{INR(j.total_cost)}</TableCell><TableCell className="text-right font-mono text-primary">{INR(j.cost_per_unit)}</TableCell></TableRow>))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Process ─────────────────────────────────────────────────────────────────

function ProcessPanel() {
  const [pid, setPid] = useState('PROC-A');
  const [period, setPeriod] = useState('2026-04');
  const [inputCost, setInputCost] = useState(200000);
  const [conv, setConv] = useState(80000);
  const [eu, setEu] = useState(500);
  const [result, setResult] = useState<ProcessCost | null>(null);
  const [list, setList] = useState<ProcessCost[]>(listProcessCosts());

  const run = () => {
    const r = computeProcessCost({
      process_id: pid, period,
      input_cost: Number(inputCost),
      conversion_cost: Number(conv),
      equivalent_units: Number(eu),
    });
    setResult(r);
    setList(listProcessCosts());
  };

  return (
    <Card className="glass-card mt-4">
      <CardHeader>
        <CardTitle>Process Costing</CardTitle>
        <CardDescription>Input + Conversion / Equivalent Units → cost / equiv-unit</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label htmlFor="p-id">Process ID</Label><Input id="p-id" value={pid} onChange={(e) => setPid(e.target.value)} /></div>
          <div><Label htmlFor="p-period">Period</Label><Input id="p-period" value={period} onChange={(e) => setPeriod(e.target.value)} /></div>
          <div><Label htmlFor="p-eu">Equivalent Units</Label><Input id="p-eu" type="number" value={eu} onChange={(e) => setEu(Number(e.target.value))} /></div>
          <div><Label htmlFor="p-ic">Input Cost</Label><Input id="p-ic" type="number" value={inputCost} onChange={(e) => setInputCost(Number(e.target.value))} /></div>
          <div><Label htmlFor="p-cv">Conversion Cost</Label><Input id="p-cv" type="number" value={conv} onChange={(e) => setConv(Number(e.target.value))} /></div>
        </div>
        <Button onClick={run}>Compute Process Cost</Button>
        {result && (
          <div className="font-mono text-sm border border-border rounded-lg p-4">
            Cost / Equiv-Unit: <span className="text-primary">{INR(result.cost_per_equiv_unit)}</span>
          </div>
        )}
        {list.length > 0 && (
          <Table>
            <TableHeader><TableRow><TableHead>Process</TableHead><TableHead>Period</TableHead><TableHead className="text-right">/Eq-Unit</TableHead></TableRow></TableHeader>
            <TableBody>{list.map((p) => (<TableRow key={`${p.process_id}-${p.period}`}><TableCell className="font-mono">{p.process_id}</TableCell><TableCell className="font-mono">{p.period}</TableCell><TableCell className="text-right font-mono text-primary">{INR(p.cost_per_equiv_unit)}</TableCell></TableRow>))}</TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

// ─── ABC ─────────────────────────────────────────────────────────────────────

function ABCPanel() {
  const [obj, setObj] = useState('PRODUCT-X');
  const [result, setResult] = useState<ABCResult | null>(null);

  const seed = () => {
    const r = computeABC({
      cost_object: obj,
      activities: [
        { activity: 'Setup', driver: 'setups', driver_qty: 5, rate: 1200 },
        { activity: 'Machining', driver: 'machine-hours', driver_qty: 40, rate: 350 },
        { activity: 'Inspection', driver: 'inspections', driver_qty: 8, rate: 200 },
      ],
    });
    setResult(r);
  };

  return (
    <Card className="glass-card mt-4">
      <CardHeader>
        <CardTitle>Activity-Based Costing (ABC)</CardTitle>
        <CardDescription>Activity-driver allocation · reuses cost-allocation-engine driver shares</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-4 items-end">
          <div className="flex-1"><Label htmlFor="abc-obj">Cost Object</Label><Input id="abc-obj" value={obj} onChange={(e) => setObj(e.target.value)} /></div>
          <Button onClick={seed}>Run Demo ABC</Button>
        </div>
        {result && (
          <>
            <Table>
              <TableHeader><TableRow><TableHead>Activity</TableHead><TableHead>Driver</TableHead><TableHead className="text-right">Qty</TableHead><TableHead className="text-right">Rate</TableHead><TableHead className="text-right">Allocated</TableHead><TableHead className="text-right">Share</TableHead></TableRow></TableHeader>
              <TableBody>
                {result.activities.map((a, i) => (
                  <TableRow key={a.activity}>
                    <TableCell className="font-mono">{a.activity}</TableCell>
                    <TableCell className="font-mono text-muted-foreground">{a.driver}</TableCell>
                    <TableCell className="text-right font-mono">{a.driver_qty}</TableCell>
                    <TableCell className="text-right font-mono">{INR(a.rate)}</TableCell>
                    <TableCell className="text-right font-mono text-primary">{INR(a.allocated)}</TableCell>
                    <TableCell className="text-right font-mono">{PCT(result.driver_shares[i] ?? 0)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            <div className="text-right font-mono">Total: <span className="text-primary">{INR(result.total_allocated)}</span></div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── CVP ─────────────────────────────────────────────────────────────────────

function CVPPanel() {
  const [fy, setFy] = useState('2026-27');
  const [scope, setScope] = useState('GROUP');
  const [fixed, setFixed] = useState(500000);
  const [sales, setSales] = useState(2000000);
  const [variable, setVariable] = useState(1200000);
  const [result, setResult] = useState<CVPResult | null>(null);

  const run = () => {
    setResult(computeCVP({
      fy, scope_id: scope,
      fixed_cost: Number(fixed),
      sales: Number(sales),
      variable_cost: Number(variable),
    }));
  };

  return (
    <Card className="glass-card mt-4">
      <CardHeader>
        <CardTitle>CVP / Break-Even Analysis</CardTitle>
        <CardDescription>Contribution margin · break-even revenue · margin of safety</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div><Label htmlFor="cvp-fy">FY</Label><Input id="cvp-fy" value={fy} onChange={(e) => setFy(e.target.value)} /></div>
          <div><Label htmlFor="cvp-scope">Scope</Label><Input id="cvp-scope" value={scope} onChange={(e) => setScope(e.target.value)} /></div>
          <div><Label htmlFor="cvp-fx">Fixed Cost</Label><Input id="cvp-fx" type="number" value={fixed} onChange={(e) => setFixed(Number(e.target.value))} /></div>
          <div><Label htmlFor="cvp-s">Sales</Label><Input id="cvp-s" type="number" value={sales} onChange={(e) => setSales(Number(e.target.value))} /></div>
          <div><Label htmlFor="cvp-v">Variable Cost</Label><Input id="cvp-v" type="number" value={variable} onChange={(e) => setVariable(Number(e.target.value))} /></div>
        </div>
        <Button onClick={run}>Compute CVP</Button>
        {result && (
          <div className="font-mono text-sm border border-border rounded-lg p-4 space-y-1">
            <div>Contribution Margin: <span className="text-primary">{INR(result.contribution_margin)}</span></div>
            <div>CM Ratio: <span className="text-primary">{PCT(result.contribution_margin_ratio)}</span></div>
            <div>Break-Even Revenue: <span className="text-primary">{INR(result.break_even_revenue)}</span></div>
            <div>Margin of Safety: <span className={result.margin_of_safety >= 0 ? 'text-success' : 'text-destructive'}>{PCT(result.margin_of_safety)}</span></div>
            {result.divide_by_zero_guarded && <div className="text-warning">Divide-by-zero guarded — break-even undefined.</div>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
