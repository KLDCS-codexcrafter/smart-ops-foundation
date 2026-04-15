/**
 * TaxRateMaster.tsx — Read-only GST Rate Reference
 * Maintained by 4DSmartOps. No CRUD.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GST_RATES, type GSTRate } from '@/data/compliance-seed-data';
import { onEnterNext } from '@/lib/keyboard';

const COUNTRY_FLAGS: Record<string, string> = { IN: '🇮🇳', AE: '🇦🇪', SG: '🇸🇬', GB: '🇬🇧' };
const COUNTRY_NAMES: Record<string, string> = { IN: 'India', AE: 'UAE', SG: 'Singapore', GB: 'United Kingdom' };

function rateColor(rate: number) {
  if (rate === 0) return 'bg-muted text-muted-foreground';
  if (rate <= 5) return 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20';
  if (rate <= 12) return 'bg-blue-500/10 text-blue-600 border-blue-500/20';
  if (rate <= 18) return 'bg-orange-500/10 text-orange-600 border-orange-500/20';
  return 'bg-red-500/10 text-red-600 border-red-500/20';
}

export function TaxRateMasterPanel() {
  const [search, setSearch] = useState('');
  const [countryFilter, setCountryFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');

  const filtered = useMemo(() =>
    GST_RATES.filter(r => {
      if (countryFilter !== 'all' && r.countryCode !== countryFilter) return false;
      if (typeFilter !== 'all' && r.taxType !== typeFilter) return false;
      return `${r.code} ${r.name}`.toLowerCase().includes(search.toLowerCase());
    }), [search, countryFilter, typeFilter]);

  const stats = useMemo(() => ({
    india: GST_RATES.filter(r => r.countryCode === 'IN').length,
    international: GST_RATES.filter(r => r.countryCode !== 'IN').length,
    cess: GST_RATES.filter(r => r.taxType === 'cess').length,
    total: GST_RATES.length,
  }), []);

  return (
    <div data-keyboard-form className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">GST Rate Reference</h1>
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
            Maintained by 4DSmartOps
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Standard GST, IGST, Cess and international tax rates applicable in India
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Last updated: Apr 2024 · GST Council Notifications — last major update: Finance Act 2024
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'India Rates', count: stats.india },
          { label: 'International Rates', count: stats.international },
          { label: 'Cess Rates', count: stats.cess },
          { label: 'Total Rates', count: stats.total },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.count}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Search rates..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={countryFilter} onValueChange={setCountryFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Countries" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Countries</SelectItem>
            <SelectItem value="IN">🇮🇳 India</SelectItem>
            <SelectItem value="AE">🇦🇪 UAE</SelectItem>
            <SelectItem value="SG">🇸🇬 Singapore</SelectItem>
            <SelectItem value="GB">🇬🇧 UK</SelectItem>
          </SelectContent>
        </Select>
        <Select value={typeFilter} onValueChange={setTypeFilter}>
          <SelectTrigger className="w-[160px]"><SelectValue placeholder="All Types" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Types</SelectItem>
            <SelectItem value="gst">GST</SelectItem>
            <SelectItem value="vat">VAT</SelectItem>
            <SelectItem value="corporate_tax">Corporate Tax</SelectItem>
            <SelectItem value="cess">Cess</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Rate Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Country</TableHead>
              <TableHead>Rate %</TableHead>
              <TableHead>Applies To</TableHead>
              <TableHead>Category</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                  No results match your search.
                </TableCell>
              </TableRow>
            ) : filtered.map(r => {
              const displayRate = r.taxType === 'cess' && r.cessRate != null ? `${r.rate}% + ${r.cessRate}% cess` : `${r.rate}%`;
              return (
                <TableRow key={r.code}>
                  <TableCell className="font-mono font-medium">{r.code}</TableCell>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{COUNTRY_FLAGS[r.countryCode] || ''} {COUNTRY_NAMES[r.countryCode] || r.countryCode}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn(rateColor(r.cessRate ?? r.rate))}>{displayRate}</Badge>
                  </TableCell>
                  <TableCell className="capitalize">{r.applicableTo}</TableCell>
                  <TableCell>{r.category}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function TaxRateMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Accounting', href: '/erp/accounting' },
            { label: 'GST Rate Reference' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <TaxRateMasterPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}
