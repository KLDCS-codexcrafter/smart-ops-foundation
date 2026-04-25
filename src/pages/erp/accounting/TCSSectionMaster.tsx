/**
 * TCSSectionMaster.tsx — Read-only TCS Section Reference
 * Maintained by 4DSmartOps. No CRUD. Backward-compatible standalone route.
 */
import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import { TCS_SECTIONS } from '@/data/compliance-seed-data';

function formatAmount(val: number | null): string {
  if (val === null) return '—';
  if (val >= 10000000) return `₹${val / 10000000}Cr`;
  if (val >= 100000) return `₹${val / 100000}L`;
  if (val >= 1000) return `₹${val / 1000}K`;
  return `₹${val}`;
}

export function TCSSectionMasterPanel() {
  const [search, setSearch] = useState('');

  const filtered = useMemo(() =>
    TCS_SECTIONS.filter(r =>
      `${r.sectionCode} ${r.natureOfGoods} ${r.sectionName}`.toLowerCase().includes(search.toLowerCase())
    ), [search]);

  return (
    <div data-keyboard-form className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">TCS Section Reference</h1>
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
            Maintained by 4DSmartOps
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Tax Collected at Source — Section 206C of the Income Tax Act
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Last updated: Oct 2024 · Finance Act 2024 — effective 01 Oct 2024
        </p>
      </div>

      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input placeholder="Search sections..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
      </div>

      <div className="border rounded-lg overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Section</TableHead>
              <TableHead>Nature of Goods/Services</TableHead>
              <TableHead>Rate %</TableHead>
              <TableHead>Threshold</TableHead>
              <TableHead>Buyer Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No results.</TableCell>
              </TableRow>
            ) : filtered.map(r => (
              <TableRow key={r.sectionCode}>
                <TableCell className="font-mono font-medium">{r.sectionCode}</TableCell>
                <TableCell className="max-w-[250px]">{r.natureOfGoods}</TableCell>
                <TableCell>{r.ratePercentage}%</TableCell>
                <TableCell>{formatAmount(r.thresholdLimit)}</TableCell>
                <TableCell className="capitalize">{r.buyerType === 'all' ? 'All' : 'Specified'}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function TCSSectionMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Accounting', href: '/erp/accounting' },
            { label: 'TCS Sections' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <TCSSectionMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
