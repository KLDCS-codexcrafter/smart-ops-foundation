/**
 * @file        src/pages/erp/procure-hub/transactions/Procure360VendorAgreementsRegister.tsx
 * @sprint      T-Phase-1.SM.Procure360-Vendor-Agreements · Block B
 * @decisions   D-NEW-CJ Hub-and-Spoke 3rd consumer
 */

import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { FileText, Plus } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listAllVendorAgreements,
  loadVendors,
} from '@/lib/procure360-vendor-agreements-engine';
import type { Procure360Module } from '../Procure360Sidebar.types';

interface Procure360VendorAgreementsRegisterProps {
  onNavigate: (m: Procure360Module) => void;
}

export function Procure360VendorAgreementsRegisterPanel({
  onNavigate,
}: Procure360VendorAgreementsRegisterProps) {
  const { entityCode } = useEntityCode();
  const vendors = useMemo(() => loadVendors(), []);
  const [filterVendorId, setFilterVendorId] = useState<string>('all');

  const allDocs = useMemo(() => listAllVendorAgreements(entityCode), [entityCode]);

  const filteredDocs = useMemo(
    () => filterVendorId === 'all'
      ? allDocs
      : allDocs.filter((d) => d.vendor_id === filterVendorId),
    [allDocs, filterVendorId],
  );

  const vendorName = (id: string | null | undefined): string => {
    if (!id) return '—';
    const v = vendors.find((vendor) => vendor.id === id);
    return v ? `${v.name}${v.vendorCode ? ` (${v.vendorCode})` : ''}` : id;
  };

  return (
    <ScrollArea className="h-full">
      <div className="p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-semibold flex items-center gap-2">
              <FileText className="h-6 w-6" />
              Vendor Agreements
            </h2>
            <p className="text-sm text-muted-foreground">
              All documents linked to vendors · {filteredDocs.length} of {allDocs.length}
            </p>
          </div>
          <Button onClick={() => onNavigate('vendor-agreement-entry')} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            New Agreement
          </Button>
        </div>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Filter by vendor</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={filterVendorId} onValueChange={setFilterVendorId}>
              <SelectTrigger className="w-[320px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {vendors.map((v) => (
                  <SelectItem key={v.id} value={v.id}>
                    {v.name}{v.vendorCode ? ` · ${v.vendorCode}` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor</TableHead>
                  <TableHead>Title</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Version</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Created</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredDocs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      No vendor agreements found
                    </TableCell>
                  </TableRow>
                ) : filteredDocs.map((doc) => (
                  <TableRow key={doc.id}>
                    <TableCell>{vendorName(doc.vendor_id)}</TableCell>
                    <TableCell className="font-medium">{doc.title}</TableCell>
                    <TableCell><Badge variant="secondary">{doc.document_type}</Badge></TableCell>
                    <TableCell className="font-mono text-sm">{doc.current_version}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {doc.versions.find((v) => v.version_no === doc.current_version)?.version_status ?? 'draft'}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </ScrollArea>
  );
}
