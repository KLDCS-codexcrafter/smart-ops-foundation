/**
 * @file        src/pages/vendor-portal/VendorKYCManagement.tsx
 * @purpose     Vendor self-KYC visibility · READ-ONLY per A-c-Q4=C v1
 * @sprint      T-Phase-1.A-c.3-VendorPortal-KYC-Invoice-Messages-Performance
 * @decisions   D-272 · A-c-Q4=C · A-c-Q10=B · Superpower #7
 * @[JWT]       N/A · reads party-master + localStorage vendor_compliance_records
 */
import { useMemo } from 'react';
import { Navigate } from 'react-router-dom';
import VendorPortalLayout from './VendorPortalLayout';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Shield, CheckCircle, AlertCircle, Clock, FileText, Bot, Calendar, Lock } from 'lucide-react';
import { getVendorSession } from '@/lib/vendor-portal-auth-engine';
import { loadPartyMaster } from '@/lib/party-master-engine';
import {
  vendorComplianceRecordKey,
  type VendorComplianceRecord,
} from '@/types/vendor-compliance-record';
import { useT } from '@/lib/i18n-engine';

function loadComplianceRecords(entityCode: string, vendorId: string): VendorComplianceRecord[] {
  try {
    const raw = localStorage.getItem(vendorComplianceRecordKey(entityCode));
    const all = raw ? (JSON.parse(raw) as VendorComplianceRecord[]) : [];
    return all.filter((r) => r.party_id === vendorId);
  } catch { return []; }
}

function daysUntilExpiry(expiryISO?: string): number | null {
  if (!expiryISO) return null;
  const ms = new Date(expiryISO).getTime() - Date.now();
  return Math.ceil(ms / 86_400_000);
}

function expiryDisplay(record: VendorComplianceRecord): { label: string; className: string; icon: typeof Clock } {
  if (!record.expiry_date) {
    return { label: 'Perpetual', className: 'bg-slate-500/10 text-slate-700 border-slate-500/30', icon: CheckCircle };
  }
  const days = daysUntilExpiry(record.expiry_date);
  if (days === null) return { label: 'Unknown', className: 'bg-slate-500/10 text-slate-700 border-slate-500/30', icon: AlertCircle };
  if (days < 0) return { label: `Expired ${-days}d ago`, className: 'bg-red-500/10 text-red-700 border-red-500/30', icon: AlertCircle };
  if (days <= 30) return { label: `Expires in ${days}d`, className: 'bg-amber-500/10 text-amber-700 border-amber-500/30', icon: Clock };
  if (days <= 90) return { label: `${days}d remaining`, className: 'bg-blue-500/10 text-blue-700 border-blue-500/30', icon: Clock };
  return { label: `${days}d remaining`, className: 'bg-emerald-500/10 text-emerald-700 border-emerald-500/30', icon: CheckCircle };
}

function verificationDisplay(status: string): { label: string; className: string } {
  if (status === 'verified') return { label: 'Verified', className: 'bg-emerald-500/15 text-emerald-700 border-emerald-500/30' };
  if (status === 'pending') return { label: 'Pending Review', className: 'bg-amber-500/15 text-amber-700 border-amber-500/30' };
  if (status === 'rejected') return { label: 'Rejected', className: 'bg-red-500/15 text-red-700 border-red-500/30' };
  return { label: status, className: 'bg-slate-500/15 text-slate-700 border-slate-500/30' };
}

export default function VendorKYCManagement(): JSX.Element {
  const session = getVendorSession();
  const t = useT();

  const data = useMemo(() => {
    if (!session) return { party: null, records: [] as VendorComplianceRecord[] };
    const parties = loadPartyMaster(session.entity_code);
    const party = parties.find((p) => p.id === session.vendor_id) ?? null;
    const records = loadComplianceRecords(session.entity_code, session.vendor_id);
    return { party, records };
  }, [session]);

  const expiringSoon = useMemo(
    () => data.records.filter((r) => {
      const days = daysUntilExpiry(r.expiry_date);
      return days !== null && days >= 0 && days <= 30;
    }).length,
    [data.records]
  );

  const expired = useMemo(
    () => data.records.filter((r) => {
      const days = daysUntilExpiry(r.expiry_date);
      return days !== null && days < 0;
    }).length,
    [data.records]
  );

  if (!session) return <Navigate to="/vendor-portal/login" replace />;

  return (
    <VendorPortalLayout>
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                {t('vendor.kyc.title', 'KYC Management')}
                <Badge variant="outline" className="text-[10px] gap-1"><Lock className="h-3 w-3" />{t('vendor.kyc.read_only_v1', 'Read-only · v1')}</Badge>
              </h1>
              <p className="text-sm text-muted-foreground">
                Your compliance documents · expiry tracking · editable upload coming Sprint A-d
              </p>
            </div>
          </div>
          <Badge variant="outline" className="gap-1 text-[10px]">
            <Bot className="h-3 w-3" /> {t('vendor.saathi.kyc_reminder', 'Saathi · KYC renewal reminders · Phase 2')}
          </Badge>
        </div>

        {expired > 0 && (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <strong>{t('vendor.kyc.expired_alert', '{n} document(s) expired', { n: expired })}</strong> · contact procurement to update urgently
            </AlertDescription>
          </Alert>
        )}
        {expiringSoon > 0 && (
          <Alert>
            <Clock className="h-4 w-4 text-amber-600" />
            <AlertDescription>
              <strong>{t('vendor.kyc.expiring_alert', '{n} document(s) expiring within 30 days', { n: expiringSoon })}</strong> · plan renewal
            </AlertDescription>
          </Alert>
        )}

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">{t('vendor.kyc.identity_title', 'Vendor Identity')}</CardTitle>
            <CardDescription>Party-master record (read-only · contact procurement for changes)</CardDescription>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Vendor Name</p>
              <p className="text-sm font-medium">{session.party_name}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">Vendor Code</p>
              <p className="text-sm font-mono">{session.party_code}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">GSTIN</p>
              <p className="text-sm font-mono">{data.party?.gstin ?? '—'}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">State</p>
              <p className="text-sm font-mono">{data.party?.state_code ?? '—'}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4" />
              {t('vendor.kyc.docs_title', 'Compliance Documents')} ({data.records.length})
            </CardTitle>
            <CardDescription>Documents on file · expiry status · verification state</CardDescription>
          </CardHeader>
          <CardContent>
            {data.records.length === 0 ? (
              <div className="text-center py-8 text-sm text-muted-foreground">
                {t('vendor.kyc.empty_state', 'No compliance documents on file · contact procurement')}
              </div>
            ) : (
              <div className="space-y-3">
                {data.records.map((record) => {
                  const expiry = expiryDisplay(record);
                  const verify = verificationDisplay(record.verification_status);
                  const ExpiryIcon = expiry.icon;
                  return (
                    <div key={record.id} className="rounded-lg border border-border/50 p-3">
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div className="min-w-0">
                          <p className="text-sm font-medium">{record.document_name}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Type: <span className="font-mono uppercase">{record.compliance_type}</span>
                            {record.document_number && ` · ${record.document_number}`}
                            {record.issuing_authority && ` · ${record.issuing_authority}`}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1 flex-shrink-0">
                          <Badge variant="outline" className={`text-[9px] ${verify.className}`}>
                            {verify.label}
                          </Badge>
                          {record.is_mandatory && (
                            <Badge variant="outline" className="text-[9px]">Mandatory</Badge>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-wrap text-[11px] text-muted-foreground">
                        {record.issue_date && (
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            Issued: {new Date(record.issue_date).toLocaleDateString('en-IN')}
                          </span>
                        )}
                        <Badge variant="outline" className={`text-[9px] gap-1 ${expiry.className}`}>
                          <ExpiryIcon className="h-3 w-3" /> {expiry.label}
                        </Badge>
                        {record.is_recurring && (
                          <span className="text-[10px]">Recurring</span>
                        )}
                      </div>
                      {record.verification_status === 'rejected' && record.rejection_reason && (
                        <Alert variant="destructive" className="mt-2 py-2">
                          <AlertDescription className="text-xs">{record.rejection_reason}</AlertDescription>
                        </Alert>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-blue-500/30 bg-blue-500/5">
          <CardContent className="p-4 flex items-start gap-3">
            <Shield className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-sm font-medium">Coming Sprint A-d</p>
              <p className="text-xs text-muted-foreground">
                Document upload + edit · expiry calendar export · automatic Saathi renewal reminders ·
                multi-language doc names · contact procurement now for any document changes.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </VendorPortalLayout>
  );
}
