/**
 * HSNSACMaster.tsx — Read-only HSN/SAC Directory
 * Maintained by 4DSmartOps. No CRUD.
 */
import { useState, useMemo } from 'react';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { Search, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { HSN_CODES, SAC_CODES, type HSNSACCode } from '@/data/hsn-sac-seed-data';
import { onEnterNext } from '@/lib/keyboard';

function HSNSACMasterPanelInner() {
  const [hsnSearch, setHsnSearch] = useState('');
  const [sacSearch, setSacSearch] = useState('');
  const [rateFilter, setRateFilter] = useState('all');

  const hsnFiltered = useMemo(() =>
    HSN_CODES.filter(r => {
      if (rateFilter !== 'all' && r.igstRate !== parseInt(rateFilter)) return false;
      return `${r.code} ${r.description}`.toLowerCase().includes(hsnSearch.toLowerCase());
    }), [hsnSearch, rateFilter]);

  const sacFiltered = useMemo(() =>
    SAC_CODES.filter(r => {
      if (rateFilter !== 'all' && r.igstRate !== parseInt(rateFilter)) return false;
      return `${r.code} ${r.description}`.toLowerCase().includes(sacSearch.toLowerCase());
    }), [sacSearch, rateFilter]);

  const stats = useMemo(() => ({
    hsn: HSN_CODES.length,
    sac: SAC_CODES.length,
    total: HSN_CODES.length + SAC_CODES.length,
    rcm: [...HSN_CODES, ...SAC_CODES].filter(r => r.reverseCharge).length,
  }), []);

  return (
    <div data-keyboard-form className="space-y-6">
      <div>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-2xl font-bold text-foreground">HSN / SAC Code Directory</h1>
          <Badge className="bg-emerald-500/10 text-emerald-700 border-emerald-500/20 text-[10px]">
            Maintained by 4DSmartOps
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Harmonised System Nomenclature and Service Accounting Codes — reference for GST filing
        </p>
        <p className="text-xs text-muted-foreground/70 mt-0.5">
          Last updated: Apr 2024 · CBIC HSN Master — updated as per GST Notification
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'HSN Codes', count: stats.hsn },
          { label: 'SAC Codes', count: stats.sac },
          { label: 'Total Codes', count: stats.total },
          { label: 'RCM Applicable', count: stats.rcm },
        ].map(s => (
          <div key={s.label} className="rounded-lg border bg-card p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.count}</p>
          </div>
        ))}
      </div>

      <Card className="p-3 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            <strong>Free API:</strong> IFSC code and GSTIN validation available in Ledger Master when creating Bank and Party ledgers.
          </p>
        </div>
      </Card>

      <div className="flex items-center gap-2">
        <Select value={rateFilter} onValueChange={setRateFilter}>
          <SelectTrigger className="w-[130px]"><SelectValue placeholder="All Rates" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Rates</SelectItem>
            <SelectItem value="0">0%</SelectItem>
            <SelectItem value="5">5%</SelectItem>
            <SelectItem value="12">12%</SelectItem>
            <SelectItem value="18">18%</SelectItem>
            <SelectItem value="28">28%</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Tabs defaultValue="hsn" className="space-y-4">
        <TabsList>
          <TabsTrigger value="hsn">HSN Codes ({HSN_CODES.length})</TabsTrigger>
          <TabsTrigger value="sac">SAC Codes ({SAC_CODES.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="hsn" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search HSN codes..." value={hsnSearch} onChange={e => setHsnSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>GST Rate</TableHead>
                  <TableHead>Chapter</TableHead>
                  <TableHead>RCM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {hsnFiltered.length === 0 ? (
                  <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No results.</TableCell></TableRow>
                ) : hsnFiltered.map(r => (
                  <TableRow key={r.code}>
                    <TableCell className="font-mono font-medium text-blue-600">{r.code}</TableCell>
                    <TableCell className="max-w-[300px]">{r.description}</TableCell>
                    <TableCell>{r.igstRate}%</TableCell>
                    <TableCell className="font-mono">{r.chapter}</TableCell>
                    <TableCell>
                      {r.reverseCharge ? <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">RCM</Badge> : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        <TabsContent value="sac" className="space-y-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search SAC codes..." value={sacSearch} onChange={e => setSacSearch(e.target.value)} className="pl-9" />
          </div>
          <div className="border rounded-lg overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>GST Rate</TableHead>
                  <TableHead>RCM</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sacFiltered.length === 0 ? (
                  <TableRow><TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No results.</TableCell></TableRow>
                ) : sacFiltered.map(r => (
                  <TableRow key={r.code}>
                    <TableCell className="font-mono font-medium text-purple-600">{r.code}</TableCell>
                    <TableCell className="max-w-[300px]">{r.description}</TableCell>
                    <TableCell>{r.igstRate}%</TableCell>
                    <TableCell>
                      {r.reverseCharge ? <Badge variant="outline" className="bg-orange-500/10 text-orange-600 border-orange-500/20 text-xs">RCM</Badge> : '—'}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function HSNSACMasterPanel() {
  return <HSNSACMasterPanelInner />;
}

export default function HSNSACMaster() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'Accounting', href: '/erp/accounting' },
            { label: 'HSN / SAC Directory' },
          ]}
          showDatePicker={false} showCompany={false}
        />
        <main className="p-6 space-y-6">
          <HSNSACMasterPanelInner />
        </main>
      </div>
    </SidebarProvider>
  );
}
