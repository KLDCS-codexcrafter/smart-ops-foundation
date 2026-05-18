/**
 * @file        src/pages/erp/vendor-portal/panels/VendorOnboardingInboxPanel.tsx
 * @sprint      T-Phase-1.A.1-VendorPortal-Foundation · A-Q10=B
 * @decisions   D-NEW-DN · D-255 token-only onboarding · D-272 self-contained portal
 * @reuses      vendor-onboarding-engine (consume only · 0-diff)
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { UserPlus, CheckCircle, AlertCircle } from 'lucide-react';
import { getOnboardingState, type OnboardingState } from '@/lib/vendor-onboarding-engine';

interface OnboardingRecord {
  vendor_id: string;
  entity_code: string;
  is_first_time: boolean;
  has_pending_password: boolean;
}

function loadAllOnboardings(): OnboardingRecord[] {
  try {
    const records: OnboardingRecord[] = [];
    const single: OnboardingState | null = getOnboardingState();
    if (single) {
      records.push({
        vendor_id: single.vendor_id,
        entity_code: single.entity_code,
        is_first_time: single.is_first_time_vendor,
        has_pending_password: single.has_pending_password_set,
      });
    }
    return records;
  } catch { return []; }
}

export function VendorOnboardingInboxPanel(): JSX.Element {
  const [refreshCounter, setRefreshCounter] = useState(0);
  const onboardings = useMemo(() => loadAllOnboardings(), [refreshCounter]);

  const stageBadge = (rec: OnboardingRecord): JSX.Element => {
    if (rec.is_first_time) {
      return <Badge variant="secondary" className="gap-1"><AlertCircle className="h-3 w-3" />First-time · Token-only</Badge>;
    }
    if (rec.has_pending_password) {
      return <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" />Password Pending</Badge>;
    }
    return <Badge className="gap-1"><CheckCircle className="h-3 w-3" />Active</Badge>;
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <UserPlus className="h-6 w-6 text-slate-600" />
          Vendor Onboarding Inbox
        </h1>
        <p className="text-sm text-muted-foreground">
          Admin view · D-255 first-quote-without-registration flow · review pending onboardings
        </p>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm">Pending Onboardings · {onboardings.length}</CardTitle>
        </CardHeader>
        <CardContent>
          {onboardings.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No pending vendor onboardings. New vendors onboarded via token URL or first-quote flow will appear here.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Vendor ID</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Stage</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {onboardings.map(o => (
                  <TableRow key={o.vendor_id}>
                    <TableCell className="font-mono text-xs">{o.vendor_id}</TableCell>
                    <TableCell><Badge variant="outline" className="text-[10px]">{o.entity_code}</Badge></TableCell>
                    <TableCell>{stageBadge(o)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Button variant="outline" onClick={() => setRefreshCounter(c => c + 1)}>
        Refresh
      </Button>
    </div>
  );
}
