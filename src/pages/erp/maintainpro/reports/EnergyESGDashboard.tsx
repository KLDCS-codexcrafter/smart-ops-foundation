/**
 * @file        src/pages/erp/maintainpro/reports/EnergyESGDashboard.tsx
 * @purpose     Equipment energy consumption (OOB-M12) · aggregate kWh by category · ESG fuel
 * @sprint      T-Phase-1.A.16c · Block C.5 · NEW
 */
import { useMemo } from 'react';
import { listEquipment, computeEquipmentEnergyConsumption } from '@/lib/maintainpro-engine';
import { MaintainProReportShell } from '@/components/maintainpro/MaintainProReportShell';

const E = 'DEMO';

export function EnergyESGDashboard(): JSX.Element {
  const data = useMemo(() => {
    const eq = listEquipment(E);
    const byCat = new Map<string, number>();
    let total = 0;
    eq.forEach((e) => {
      const kwh = computeEquipmentEnergyConsumption(e);
      total += kwh;
      byCat.set(e.category, (byCat.get(e.category) ?? 0) + kwh);
    });
    return { total, byCat: Array.from(byCat.entries()).sort((a, b) => b[1] - a[1]), eq };
  }, []);

  return (
    <MaintainProReportShell
      title="Energy / ESG Dashboard"
      ssotBadge="OOB-M12 · ESG fuel"
      kpis={
        <>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Total kWh (12m est.)</div><div className="text-2xl font-mono">{data.total.toFixed(0)}</div></div>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Equipment</div><div className="text-2xl font-mono">{data.eq.length}</div></div>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">Categories</div><div className="text-2xl font-mono">{data.byCat.length}</div></div>
          <div className="rounded border p-3"><div className="text-xs text-muted-foreground">CO₂e (est.)</div><div className="text-2xl font-mono">{(data.total * 0.82).toFixed(0)}kg</div></div>
        </>
      }
    >
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground">
          <tr><th className="p-2">Category</th><th className="p-2">Estimated kWh (12m)</th><th className="p-2">Share</th></tr>
        </thead>
        <tbody>
          {data.byCat.length === 0 && <tr><td colSpan={3} className="p-4 text-center text-muted-foreground">No data</td></tr>}
          {data.byCat.map(([cat, kwh]) => (
            <tr key={cat} className="border-t">
              <td className="p-2">{cat}</td>
              <td className="p-2 font-mono">{kwh.toFixed(0)}</td>
              <td className="p-2 font-mono">{data.total === 0 ? '—' : ((kwh / data.total) * 100).toFixed(1)}%</td>
            </tr>
          ))}
        </tbody>
      </table>
    </MaintainProReportShell>
  );
}

export default EnergyESGDashboard;
