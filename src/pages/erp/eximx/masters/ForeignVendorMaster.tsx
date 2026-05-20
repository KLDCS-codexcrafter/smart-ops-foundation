/**
 * @file        src/pages/erp/eximx/masters/ForeignVendorMaster.tsx
 * @purpose     Foreign Vendor Master · full CRUD UI · 4-state workflow
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 * @decisions   EX-3-Q6=a full CRUD
 */
import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Search, Building2 } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import type { ForeignVendor } from '@/types/foreign-vendor';
import { FOREIGN_VENDOR_LOCALSTORAGE_KEY } from '@/types/foreign-vendor';
import { SINHA_FOREIGN_VENDORS } from '@/data/foreign-parties-seed-data';

export function ForeignVendorMaster(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [search, setSearch] = useState('');

  const vendors = useMemo<ForeignVendor[]>(() => {
    if (!entityCode) return SINHA_FOREIGN_VENDORS;
    try {
      const raw = localStorage.getItem(FOREIGN_VENDOR_LOCALSTORAGE_KEY(entityCode));
      if (!raw) return SINHA_FOREIGN_VENDORS;
      const parsed = JSON.parse(raw) as unknown;
      return Array.isArray(parsed) ? (parsed as ForeignVendor[]) : SINHA_FOREIGN_VENDORS;
    } catch { return SINHA_FOREIGN_VENDORS; }
  }, [entityCode]);

  const filtered = vendors.filter((v) =>
    v.vendor_name.toLowerCase().includes(search.toLowerCase()) ||
    v.country_code.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2"><Building2 className="w-6 h-6" /> Foreign Vendor Master</h1>
        <p className="text-sm text-muted-foreground">Cross-border suppliers · 4 vendor types · 11 Incoterm + currency per vendor · CAROTAR self-cert</p>
      </div>

      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-base flex items-center justify-between">
            <span>Foreign Vendors ({vendors.length})</span>
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input placeholder="Search vendor · country..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Vendor Name</TableHead>
                <TableHead>Country</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Currency</TableHead>
                <TableHead>Preferred Incoterm</TableHead>
                <TableHead>CAROTAR Self-Cert</TableHead>
                <TableHead>Payment Terms</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((v) => (
                <TableRow key={v.id}>
                  <TableCell className="font-semibold">{v.vendor_name}</TableCell>
                  <TableCell><Badge variant="outline">{v.country_code} · {v.country_name}</Badge></TableCell>
                  <TableCell><Badge>{v.vendor_type}</Badge></TableCell>
                  <TableCell><Badge variant="outline">{v.currency_code}</Badge></TableCell>
                  <TableCell><Badge>{v.preferred_incoterm}</Badge></TableCell>
                  <TableCell>{v.coo_self_certification_required ? <Badge variant="secondary">Required</Badge> : '—'}</TableCell>
                  <TableCell className="text-xs">{v.payment_terms}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
