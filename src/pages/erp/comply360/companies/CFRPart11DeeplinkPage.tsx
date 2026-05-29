/**
 * @file        src/pages/erp/comply360/companies/CFRPart11DeeplinkPage.tsx
 * @purpose     Sprint 77b · CFR Part 11 light surface · operational audit-trail lives in QualiCheck
 *              per CORR-5. Deep-link via react-router only (QualiCheck dirs §H frozen).
 * @sprint      Sprint 77b · T-Phase-5.A.1.9-PASS-B · Block 3
 * @disciplines FR-7 · FR-13 · FR-19 (cfr-part-11-engine + QualiCheck 0-DIFF)
 */
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ExternalLink, ShieldCheck, FileSignature, Database } from 'lucide-react';

export default function CFRPart11DeeplinkPage(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">21 CFR Part 11 · Electronic Records & Signatures</h1>
        <p className="text-muted-foreground text-sm">
          FDA 21 CFR Part 11 governs electronic records and electronic signatures in regulated industries.
          The operational audit-trail viewer lives in QualiCheck (CORR-5).
        </p>
      </div>

      <Card className="p-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-emerald-600" />
              <span className="font-semibold">Coverage scope</span>
            </div>
            <ul className="text-sm text-muted-foreground space-y-1">
              <li>• §11.10 Controls for closed systems · validated workflows</li>
              <li>• §11.50 Signature manifestations · printed-name, date, meaning</li>
              <li>• §11.70 Signature/record linking · tamper-evident hash chain</li>
              <li>• §11.100 General requirements for electronic signatures</li>
            </ul>
            <div className="flex items-center gap-2 pt-2">
              <Badge variant="secondary"><FileSignature className="h-3 w-3 mr-1" />Electronic signatures</Badge>
              <Badge variant="secondary"><Database className="h-3 w-3 mr-1" />Audit trail</Badge>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <Button
              size="lg"
              onClick={() => navigate('/erp/qualicheck?module=qc-r-cfr-part-11-audit-trail')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Open Full Audit Trail in QualiCheck
            </Button>
            {/* Sprint 79c · Pass C · CORR-5 deep-link button · operational viewer stays in QualiCheck */}
            <Button
              size="sm"
              variant="outline"
              onClick={() => { window.location.href = '/erp/qualicheck/reports/CFRPart11AuditTrailViewer'; }}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              View Detailed Audit Trail
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-4">
        <h2 className="text-sm font-semibold uppercase text-muted-foreground mb-2">Why QualiCheck?</h2>
        <p className="text-sm text-muted-foreground">
          QualiCheck owns the QA & lab compliance lane in Operix. The CFR Part 11 audit-trail viewer
          (event chain, hash verification, signer attestations) is operated alongside FAI / NCR / CAPA
          workflows there. Comply360 surfaces the regulatory context and routes you in.
        </p>
      </Card>
    </div>
  );
}
