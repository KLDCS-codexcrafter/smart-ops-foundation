/**
 * SalesXHub.tsx — Welcome dashboard for SalesX
 * Sprint 3: commission KPIs added.
 * Reads SAMConfig from comply360SAMKey, persons from samPersonsKey, leads from leadsKey.
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  UserCheck, Briefcase, Users, Settings2,
  Wallet, Receipt, FileText, IndianRupee,
} from 'lucide-react';
import { samPersonsKey } from '@/types/sam-person';
import type { SAMPerson, SAMPersonType } from '@/types/sam-person';
import { leadsKey } from '@/types/lead';
import type { Lead } from '@/types/lead';
import { commissionRegisterKey } from '@/types/commission-register';
import type { CommissionEntry } from '@/types/commission-register';
import { comply360SAMKey } from '@/pages/erp/accounting/Comply360Config';
import type { SAMConfig } from '@/pages/erp/accounting/Comply360Config';
import { useEnquiries } from '@/hooks/useEnquiries';
import { useQuotations } from '@/hooks/useQuotations';
import { cn } from '@/lib/utils';

interface Props {
  entityCode: string;
  onNavigate?: (mod: string) => void;
}

const inrFmt = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatINR = (n: number) => `₹${inrFmt.format(n)}`;

const TYPE_BADGE: Record<SAMPersonType, string> = {
  salesman:  'bg-orange-500/15 text-orange-600 border-orange-500/30',
  agent:     'bg-amber-500/15 text-amber-600 border-amber-500/30',
  broker:    'bg-yellow-500/15 text-yellow-700 border-yellow-500/30',
  receiver:  'bg-blue-500/15 text-blue-600 border-blue-500/30',
  reference: 'bg-teal-500/15 text-teal-600 border-teal-500/30',
};

function loadCfg(entityCode: string): SAMConfig | null {
  try {
    // [JWT] GET /api/compliance/comply360/sam/:entityCode
    const raw = localStorage.getItem(comply360SAMKey(entityCode));
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}
function loadPersons(entityCode: string): SAMPerson[] {
  try {
    // [JWT] GET /api/salesx/sam/persons?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(samPersonsKey(entityCode)) || '[]');
  } catch { return []; }
}
function loadLeads(entityCode: string): Lead[] {
  try {
    // [JWT] GET /api/salesx/leads?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(leadsKey(entityCode)) || '[]');
  } catch { return []; }
}
function loadCommissionRegister(entityCode: string): CommissionEntry[] {
  try {
    // [JWT] GET /api/salesx/commission-register?entityCode={entityCode}
    return JSON.parse(localStorage.getItem(commissionRegisterKey(entityCode)) || '[]');
  } catch { return []; }
}

export function SalesXHubPanel({ entityCode, onNavigate }: Props) {
  const navigate = useNavigate();
  const cfg = useMemo(() => loadCfg(entityCode), [entityCode]);
  const persons = useMemo(() => loadPersons(entityCode), [entityCode]);
  const _leads = useMemo(() => loadLeads(entityCode), [entityCode]);
  void _leads;
  const register = useMemo(() => loadCommissionRegister(entityCode), [entityCode]);
  const { enquiries } = useEnquiries(entityCode);
  const { quotations } = useQuotations(entityCode);

  // counts removed — 4 old KPI cards replaced with new ones

  const commissionKpis = useMemo(() => {
    return register.reduce((acc, e) => {
      acc.totalCommission += e.total_commission;
      acc.netPaid += e.net_paid_to_date;
      acc.tdsDeducted += e.tds_deducted_to_date;
      const pending = e.total_commission - e.commission_earned_to_date;
      acc.pending += pending > 0 ? pending : 0;
      return acc;
    }, { totalCommission: 0, netPaid: 0, tdsDeducted: 0, pending: 0 });
  }, [register]);

  const enquiryKpi = enquiries.length;
  const quotationKpi = quotations.length;

  const recent = useMemo(() => {
    return [...persons]
      .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
      .slice(0, 8);
  }, [persons]);

  const recentCommission = useMemo(() => {
    return [...register]
      .sort((a, b) => b.voucher_date.localeCompare(a.voucher_date))
      .slice(0, 5);
  }, [register]);

  const moduleStatus: Array<{ label: string; on: boolean }> = [
    { label: 'Company Salesman', on: !!cfg?.enableCompanySalesMan },
    { label: 'Agent Module',     on: !!cfg?.enableAgentModule },
    { label: 'CRM',              on: !!cfg?.enableCRM },
    { label: 'Telecalling',      on: !!cfg?.enableTelecalling },
    { label: 'Reference',        on: !!cfg?.enableReference },
    { label: 'Portfolio',        on: !!cfg?.enablePortfolioAssignment },
    { label: 'Hierarchy',        on: !!cfg?.enableHierarchyMaster },
  ];

  const go = (m: string) => onNavigate ? onNavigate(m) : undefined;

  return (
    <div data-keyboard-form className="space-y-4">
      {/* Primary KPI cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Active Enquiries */}
        <Card className="border-l-4 border-l-purple-500 cursor-pointer hover:shadow-md transition" onClick={() => go('sx-t-enquiry')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <Users className="h-3.5 w-3.5" /> Active Enquiries
            </div>
            <p className="text-2xl font-bold font-mono mt-1">{enquiryKpi}</p>
          </CardContent>
        </Card>

        {/* Pipeline Value */}
        <Card className="border-l-4 border-l-blue-500 cursor-pointer hover:shadow-md transition" onClick={() => go('sx-t-pipeline')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <IndianRupee className="h-3.5 w-3.5" /> Pipeline Value
            </div>
            <p className="text-2xl font-bold font-mono mt-1">
              ₹{quotationKpi.toLocaleString('en-IN')}
            </p>
          </CardContent>
        </Card>

        {/* Pending Commission */}
        {(cfg?.enableAgentModule || cfg?.enableCompanySalesMan) && (
          <Card className="border-l-4 border-l-yellow-500 cursor-pointer hover:shadow-md transition" onClick={() => go('sx-r-commission')}>
            <CardContent className="pt-4">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Wallet className="h-3.5 w-3.5" /> Pending Commission
              </div>
              <p className="text-2xl font-bold font-mono mt-1">
                ₹{commissionKpis.pending.toLocaleString('en-IN')}
              </p>
            </CardContent>
          </Card>
        )}

        {/* Open Quotations */}
        <Card className="border-l-4 border-l-orange-500 cursor-pointer hover:shadow-md transition" onClick={() => go('sx-t-quotation')}>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <FileText className="h-3.5 w-3.5" /> Open Quotations
            </div>
            <p className="text-2xl font-bold font-mono mt-1">{quotationKpi}</p>
          </CardContent>
        </Card>
      </div>

      {/* Sprint 3 — Commission & pipeline KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Card className="border-l-4 border-l-orange-500">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Wallet className="h-3 w-3" /> Total Commission
            </div>
            <p className="text-base font-bold font-mono mt-0.5">{formatINR(commissionKpis.totalCommission)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-emerald-500">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Receipt className="h-3 w-3" /> Net Paid
            </div>
            <p className="text-base font-bold font-mono mt-0.5">{formatINR(commissionKpis.netPaid)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-yellow-500">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Receipt className="h-3 w-3" /> Pending
            </div>
            <p className="text-base font-bold font-mono mt-0.5">{formatINR(commissionKpis.pending)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-destructive">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Receipt className="h-3 w-3" /> TDS Deducted
            </div>
            <p className="text-base font-bold font-mono mt-0.5">{formatINR(commissionKpis.tdsDeducted)}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-purple-500">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <Users className="h-3 w-3" /> Enquiries
            </div>
            <p className="text-base font-bold font-mono mt-0.5">{enquiryKpi}</p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-blue-500">
          <CardContent className="pt-3 pb-3">
            <div className="flex items-center gap-2 text-[11px] text-muted-foreground">
              <FileText className="h-3 w-3" /> Quotations
            </div>
            <p className="text-base font-bold font-mono mt-0.5">{quotationKpi}</p>
          </CardContent>
        </Card>
      </div>

      {/* Quick actions */}
      <div className="flex flex-wrap items-center gap-2">
        {cfg?.enableCompanySalesMan && (
          <Button data-primary size="sm" onClick={() => go('sx-m-salesman')}
            className="bg-orange-500 hover:bg-orange-600">
            <UserCheck className="h-3.5 w-3.5 mr-1" /> New Salesman
          </Button>
        )}
        {cfg?.enableAgentModule && (
          <Button variant="outline" size="sm" onClick={() => go('sx-m-agent')}>
            <Briefcase className="h-3.5 w-3.5 mr-1" /> New Agent
          </Button>
        )}
        <Button variant="outline" size="sm" onClick={() => go('sx-r-commission')}>
          <Wallet className="h-3.5 w-3.5 mr-1" /> Commission Register
        </Button>
        <Button variant="outline" size="sm" onClick={() => go('sx-r-pipeline-summary')}>
          <FileText className="h-3.5 w-3.5 mr-1" /> Pipeline Summary
        </Button>
        {!cfg?.enableSalesActivityModule && (
          <Button variant="outline" size="sm"
            onClick={() => navigate('/erp/accounting/comply360-config')}>
            <Settings2 className="h-3.5 w-3.5 mr-1" /> Configure SAM
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Recent SAM activity */}
        <Card className="lg:col-span-2">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">Recent SAM activity</CardTitle>
          </CardHeader>
          <CardContent>
            {recent.length === 0 ? (
              <p className="text-xs text-muted-foreground py-4 text-center">
                No SAM persons yet. Configure SAM and create your first salesman.
              </p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="text-xs">Name</TableHead>
                    <TableHead className="text-xs">Type</TableHead>
                    <TableHead className="text-xs">Code</TableHead>
                    <TableHead className="text-xs">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {recent.map(p => (
                    <TableRow key={p.id}>
                      <TableCell className="text-xs font-medium">{p.display_name}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn('text-[10px]', TYPE_BADGE[p.person_type])}>
                          {p.person_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs font-mono">{p.person_code}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={cn(
                          'text-[10px]',
                          p.is_active
                            ? 'bg-success/15 text-success border-success/30'
                            : 'bg-destructive/15 text-destructive border-destructive/30',
                        )}>
                          {p.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* Module status */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm">SAM module status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1.5">
            {moduleStatus.map(s => (
              <div key={s.label} className="flex items-center justify-between">
                <span className="text-xs">{s.label}</span>
                <Badge variant="outline" className={cn(
                  'text-[10px]',
                  s.on
                    ? 'bg-success/15 text-success border-success/30'
                    : 'bg-muted text-muted-foreground border-border',
                )}>
                  {s.on ? 'Enabled' : 'Off'}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Recent commission */}
      {recentCommission.length > 0 && (
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm">Recent commission entries</CardTitle>
            <Button variant="ghost" size="sm" className="text-xs h-7"
              onClick={() => go('sx-r-commission')}>
              View all
            </Button>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Invoice</TableHead>
                  <TableHead className="text-xs">Customer</TableHead>
                  <TableHead className="text-xs">Person</TableHead>
                  <TableHead className="text-xs text-right">Commission</TableHead>
                  <TableHead className="text-xs text-right">Net Paid</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentCommission.map(e => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs font-mono">{e.voucher_no}</TableCell>
                    <TableCell className="text-xs">{e.customer_name}</TableCell>
                    <TableCell className="text-xs">{e.person_name}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatINR(e.total_commission)}</TableCell>
                    <TableCell className="text-xs text-right font-mono">{formatINR(e.net_paid_to_date)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className="text-[10px] capitalize">{e.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function SalesXHub(props: Props) {
  return <SalesXHubPanel {...props} />;
}
