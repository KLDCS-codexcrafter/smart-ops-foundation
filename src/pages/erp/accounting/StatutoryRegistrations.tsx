/**
 * StatutoryRegistrations.tsx — Zone 3 Session 2
 * Read-only view of all statutory registrations across entities.
 * Registrations are managed in Entity Core → Governance.
 */
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ArrowLeft, Info, ExternalLink } from 'lucide-react';

interface StatutoryRegistrationRow {
  id: string;
  entityName: string;
  entityType: 'Company' | 'Subsidiary' | 'Branch';
  registrationType: string;
  registrationNumber: string;
  state: string;
  validFrom: string;
  validTo: string;
  status: 'Active' | 'Applied' | 'Suspended';
}

const MOCK_DATA: StatutoryRegistrationRow[] = [
  { id: '1', entityName: '4DSmartOps Pvt Ltd', entityType: 'Company', registrationType: 'GSTIN', registrationNumber: '27AABCU9603R1ZM', state: 'Maharashtra', validFrom: '2023-04-01', validTo: '—', status: 'Active' },
  { id: '2', entityName: 'SmartOps Digital LLP', entityType: 'Subsidiary', registrationType: 'TAN', registrationNumber: 'MUMS12345E', state: 'Maharashtra', validFrom: '2023-07-01', validTo: '2026-06-30', status: 'Active' },
  { id: '3', entityName: '4D Exports SEZ Unit', entityType: 'Branch', registrationType: 'EPF', registrationNumber: 'MHBAN0012345000', state: 'Karnataka', validFrom: '2024-01-01', validTo: '—', status: 'Active' },
  { id: '4', entityName: '4DSmartOps Pvt Ltd', entityType: 'Company', registrationType: 'PAN', registrationNumber: 'AABCU9603R', state: '—', validFrom: '2020-01-15', validTo: '—', status: 'Active' },
];

const TYPE_COLORS: Record<string, string> = {
  GSTIN: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  TAN: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  PAN: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400',
  EPF: 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400',
};

const STATUS_COLORS: Record<string, string> = {
  Active: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  Applied: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
  Suspended: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export function StatutoryRegistrationsPanel() {
  const navigate = useNavigate();

  const total = MOCK_DATA.length;
  const active = MOCK_DATA.filter(r => r.status === 'Active').length;
  const types = new Set(MOCK_DATA.map(r => r.registrationType)).size;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Statutory Registrations</h1>
        <p className="text-sm text-muted-foreground">Consolidated view of all statutory registrations across entities</p>
      </div>

      <Card className="p-4 border-blue-200 bg-blue-50/50 dark:bg-blue-950/20 dark:border-blue-800">
        <div className="flex gap-2">
          <Info className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700 dark:text-blue-300">
            Statutory registrations are managed in Entity Core → Governance. This page shows all registrations in one place for reference.
          </p>
        </div>
      </Card>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
        {[
          { label: 'Total Registrations', value: total },
          { label: 'Active', value: active },
          { label: 'Registration Types', value: types },
        ].map(s => (
          <Card key={s.label} className="p-4">
            <p className="text-sm text-muted-foreground">{s.label}</p>
            <p className="text-2xl font-bold text-foreground">{s.value}</p>
          </Card>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Entity Name</TableHead>
              <TableHead>Entity Type</TableHead>
              <TableHead>Registration Type</TableHead>
              <TableHead>Registration Number</TableHead>
              <TableHead>State</TableHead>
              <TableHead>Valid From</TableHead>
              <TableHead>Valid To</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {MOCK_DATA.map(r => (
              <TableRow key={r.id}>
                <TableCell className="text-xs font-medium">{r.entityName}</TableCell>
                <TableCell><Badge variant="outline" className="text-[10px]">{r.entityType}</Badge></TableCell>
                <TableCell><Badge className={`text-[10px] ${TYPE_COLORS[r.registrationType] ?? ''}`}>{r.registrationType}</Badge></TableCell>
                <TableCell className="text-xs font-mono">{r.registrationNumber}</TableCell>
                <TableCell className="text-xs">{r.state}</TableCell>
                <TableCell className="text-xs">{r.validFrom}</TableCell>
                <TableCell className="text-xs">{r.validTo}</TableCell>
                <TableCell><Badge className={`text-[10px] ${STATUS_COLORS[r.status] ?? ''}`}>{r.status}</Badge></TableCell>
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
    </div>
  );
}

export default function StatutoryRegistrations() {
  const navigate = useNavigate();

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label: 'Operix Core', href: '/erp/dashboard' },
            { label: 'FineCore', href: '/erp/accounting' },
            { label: 'Statutory Registrations' },
          ]}
          showDatePicker={false}
          showCompany={false}
        />
        <main className="p-6 space-y-6">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate('/erp/accounting')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </div>
          <StatutoryRegistrationsPanel />
        </main>
      </div>
    </SidebarProvider>
  );
}