/**
 * GSTEntityConfig.tsx — Zone 3 Session 2
 * Read-only view of GST configuration across entities.
 * GST configuration is managed in Entity Core → Governance → GST tab.
 */
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Info, ExternalLink, Check, Minus } from 'lucide-react';

interface GSTEntityRow {
  id: string;
  entityName: string;
  gstin: string;
  registrationType: string;
  eInvoice: boolean;
  qrmpEnrolled: boolean;
  turnoverSlab: string;
  effectiveFrom: string;
}

const MOCK_DATA: GSTEntityRow[] = [
  { id: '1', entityName: '4DSmartOps Pvt Ltd', gstin: '27AABCU9603R1ZM', registrationType: 'Regular', eInvoice: true, qrmpEnrolled: false, turnoverSlab: 'Rs 5 Cr to Rs 20 Cr', effectiveFrom: '2023-04-01' },
  { id: '2', entityName: 'SmartOps Digital LLP', gstin: '29AADCS1234P1Z5', registrationType: 'Regular', eInvoice: false, qrmpEnrolled: true, turnoverSlab: 'Up to Rs 1.5 Cr', effectiveFrom: '2024-01-01' },
  { id: '3', entityName: '4D Exports SEZ Unit', gstin: '27AABCU9603R2ZN', registrationType: 'SEZ Unit', eInvoice: true, qrmpEnrolled: false, turnoverSlab: 'Rs 20 Cr to Rs 100 Cr', effectiveFrom: '2023-07-01' },
];

export default function GSTEntityConfigPage() {
  const navigate = useNavigate();

  const total = MOCK_DATA.length;
  const eInvoice = MOCK_DATA.filter(r => r.eInvoice).length;
  const qrmp = MOCK_DATA.filter(r => r.qrmpEnrolled).length;

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'FineCore', href: '/erp/accounting' },
            { label: 'GST Entity Config' },
          ]}
          showDatePicker={false}
          showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold text-foreground">GST Entity Configuration</h1>
              <p className="text-sm text-muted-foreground">Consolidated view of GST settings across all entities</p>
            </div>
          </div>

          {/* Info banner */}
          <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
            <div className="flex gap-2">
              <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
              <p className="text-xs text-blue-700 dark:text-blue-300">
                GST configuration is managed in Entity Core → Governance → GST tab. This page shows all entities in one place.
              </p>
            </div>
          </Card>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Total Entities', value: total },
              { label: 'E-Invoice Applicable', value: eInvoice },
              { label: 'QRMP Enrolled', value: qrmp },
            ].map(s => (
              <Card key={s.label} className="p-4">
                <p className="text-sm text-muted-foreground">{s.label}</p>
                <p className="text-2xl font-bold text-foreground">{s.value}</p>
              </Card>
            ))}
          </div>

          {/* Table */}
          <div className="border rounded-lg overflow-hidden">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Entity Name</TableHead>
                  <TableHead>GSTIN</TableHead>
                  <TableHead>Registration Type</TableHead>
                  <TableHead className="text-center">E-Invoice</TableHead>
                  <TableHead className="text-center">QRMP Enrolled</TableHead>
                  <TableHead>Turnover Slab</TableHead>
                  <TableHead>Effective From</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {MOCK_DATA.map(r => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs font-medium">{r.entityName}</TableCell>
                    <TableCell className="text-xs font-mono">{r.gstin}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{r.registrationType}</Badge></TableCell>
                    <TableCell className="text-center">
                      {r.eInvoice ? <Check className="h-4 w-4 text-emerald-500 mx-auto" /> : <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </TableCell>
                    <TableCell className="text-center">
                      {r.qrmpEnrolled ? <Badge className="text-[10px] bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">QRMP</Badge> : <Minus className="h-4 w-4 text-muted-foreground mx-auto" />}
                    </TableCell>
                    <TableCell className="text-xs">{r.turnoverSlab}</TableCell>
                    <TableCell className="text-xs">{r.effectiveFrom}</TableCell>
                    <TableCell className="text-right">
                      <Button variant="outline" size="sm" className="h-7 text-xs" onClick={() => navigate('/erp/foundation/entities')}>
                        <ExternalLink className="h-3 w-3 mr-1" /> Edit in Entity Profile
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}
