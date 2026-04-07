/**
 * ProfessionalTaxMaster.tsx — Read-only Professional Tax Reference
 * Maintained by 4DSmartOps. No CRUD.
 */
import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Info } from 'lucide-react';
import { PROFESSIONAL_TAX_SLABS, type ProfessionalTaxSlab } from '@/data/payroll-statutory-seed-data';

export function ProfessionalTaxMasterPanel() {
  const [search, setSearch] = useState('');
  const [stateFilter, setStateFilter] = useState('all');

  const distinctStates = useMemo(() => {
    const s = [...new Set(PROFESSIONAL_TAX_SLABS.map(r => r.stateCode))].sort();
    return s.map(code => ({ code, name: PROFESSIONAL_TAX_SLABS.find(r => r.stateCode === code)?.stateName ?? code }));
  }, []);

  const filtered = useMemo(() => {
    let f = PROFESSIONAL_TAX_SLABS as ProfessionalTaxSlab[];
    if (stateFilter !== 'all') f = f.filter(r => r.stateCode === stateFilter);
    if (search) {
      const q = search.toLowerCase();
      f = f.filter(r => r.stateCode.toLowerCase().includes(q) || r.stateName.toLowerCase().includes(q));
    }
    return f;
  }, [search, stateFilter]);

  const grouped = useMemo(() => {
    const map = new Map<string, ProfessionalTaxSlab[]>();
    filtered.forEach(r => {
      if (!map.has(r.stateCode)) map.set(r.stateCode, []);
      map.get(r.stateCode)!.push(r);
    });
    map.forEach(arr => arr.sort((a, b) => a.slabFrom - b.slabFrom));
    return map;
  }, [filtered]);

  const statesConfigured = new Set(PROFESSIONAL_TAX_SLABS.map(r => r.stateCode)).size;
  const totalSlabs = PROFESSIONAL_TAX_SLABS.length;
  const maxTax = Math.max(...PROFESSIONAL_TAX_SLABS.map(r => r.monthlyTax));
  const fmt = (n: number) => n.toLocaleString('en-IN');

  return (
    <div className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">Professional Tax Reference</h1>
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
            Maintained by 4DSmartOps
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          State-wise PT slabs — deducted from employee salary by employer
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Last updated: Apr 2024 · State Budget notifications — 2024-25. Not all states levy PT.
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'States Configured', value: statesConfigured },
          { label: 'Total Slabs', value: totalSlabs },
          { label: 'Max Tax (₹)', value: fmt(maxTax) },
          { label: 'Annual Max (₹)', value: '2,500' },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-3 border-amber-200 bg-amber-50/50 dark:bg-amber-950/20 dark:border-amber-800">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
          <p className="text-xs text-amber-700 dark:text-amber-300">
            States not listed (Rajasthan, HP, etc.) do not levy Professional Tax.
          </p>
        </div>
      </Card>

      <div className="flex flex-wrap items-center gap-3">
        <Input placeholder="Search state..." value={search} onChange={e => setSearch(e.target.value)} className="w-64 h-9 text-sm" />
        <Select value={stateFilter} onValueChange={setStateFilter}>
          <SelectTrigger className="w-48 h-9 text-sm"><SelectValue placeholder="All States" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All States</SelectItem>
            {distinctStates.map(s => (
              <SelectItem key={s.code} value={s.code}>{s.code} — {s.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State Code</TableHead>
              <TableHead>State Name</TableHead>
              <TableHead className="text-right">Slab From (₹)</TableHead>
              <TableHead className="text-right">Slab To (₹)</TableHead>
              <TableHead className="text-right">Monthly Tax (₹)</TableHead>
              <TableHead className="text-right">Annual Max</TableHead>
              <TableHead>Gender Exemption</TableHead>
              <TableHead>Effective From</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {grouped.size === 0 && (
              <TableRow><TableCell colSpan={8} className="text-center py-12 text-muted-foreground">No results.</TableCell></TableRow>
            )}
            {Array.from(grouped.entries()).map(([stateCode, slabs]) => (
              <>
                <TableRow key={`hdr-${stateCode}`} className="bg-indigo-500/10">
                  <TableCell colSpan={8} className="font-semibold text-sm text-indigo-600 dark:text-indigo-400 py-2">
                    {stateCode} — {slabs[0].stateName} ({slabs.length} slabs)
                  </TableCell>
                </TableRow>
                {slabs.map((slab) => (
                  <TableRow key={`${stateCode}-${slab.slabFrom}`}>
                    <TableCell className="text-xs">{slab.stateCode}</TableCell>
                    <TableCell className="text-xs">{slab.stateName}</TableCell>
                    <TableCell className="text-right text-xs font-mono">₹{fmt(slab.slabFrom)}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{slab.slabTo !== null ? `₹${fmt(slab.slabTo)}` : <span className="text-muted-foreground italic">No Limit</span>}</TableCell>
                    <TableCell className="text-right text-xs font-mono font-semibold">₹{fmt(slab.monthlyTax)}</TableCell>
                    <TableCell className="text-right text-xs font-mono">{slab.annualMax ? `₹${fmt(slab.annualMax)}` : '—'}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px]">
                        {slab.genderExemption === 'none' ? 'None' : slab.genderExemption === 'female' ? 'Female Exempt' : 'All Exempt'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">{slab.effectiveFrom}</TableCell>
                  </TableRow>
                ))}
              </>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function ProfessionalTaxMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'FineCore', href: '/erp/accounting' },
            { label: 'Professional Tax Reference' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <ProfessionalTaxMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
