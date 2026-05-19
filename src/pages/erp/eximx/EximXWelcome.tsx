/**
 * @file        src/pages/erp/eximx/EximXWelcome.tsx
 * @purpose     EximX Welcome · 4 pulse metrics + 6 quick actions + Saathi TDL Gaps Atlas tile
 * @sprint      T-Phase-1.EX-1-EximX-Foundation
 * @decisions   EX-1-Q5 (4 pulse metrics) · EX-1-Q6=b (Saathi educational) · Moat #13
 */
import { useState, useEffect } from 'react';
import { summarizeIECValidity } from '@/lib/iec-engine';
import { summarizeLUTExpiry } from '@/lib/lut-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Globe, Award, Package, ArrowUpRight, Bot, FileText, BarChart3 } from 'lucide-react';

const DEFAULT_ENTITY = 'sinha-trading';

interface EximXWelcomeProps {
  onNavigate: (moduleId: string) => void;
}

export function EximXWelcome({ onNavigate }: EximXWelcomeProps): JSX.Element {
  const [iecSummary, setIecSummary] = useState({ valid: 0, expiring: 0, expired: 0, total: 0 });
  const [lutSummary, setLutSummary] = useState({ safe: 0, expiring: 0, renewalDue: 0, expired: 0, total: 0 });

  useEffect(() => {
    setIecSummary(summarizeIECValidity(DEFAULT_ENTITY));
    setLutSummary(summarizeLUTExpiry(DEFAULT_ENTITY));
  }, []);

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">EximX · International Trade Hub</h1>
        <p className="text-muted-foreground mt-1">
          Sinha Trading · Multi-OEM importer-exporter · Tier 1 #14 · v10 FINAL · 17 Q-LOCKS ratified · 19 moats roadmap · 12-13 sprint arc
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4" /> IEC Validity</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{iecSummary.total}</div>
            <div className="flex gap-1 mt-2 flex-wrap">
              <Badge variant="default">{iecSummary.valid} valid</Badge>
              {iecSummary.expiring > 0 && <Badge variant="secondary">{iecSummary.expiring} expiring</Badge>}
              {iecSummary.expired > 0 && <Badge variant="destructive">{iecSummary.expired} expired</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileText className="w-4 h-4" /> LUT Expiry</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold font-mono">{lutSummary.total}</div>
            <div className="flex gap-1 mt-2 flex-wrap">
              <Badge variant="default">{lutSummary.safe} safe</Badge>
              {lutSummary.expiring > 0 && <Badge variant="secondary">{lutSummary.expiring} exp&lt;90d</Badge>}
              {lutSummary.renewalDue > 0 && <Badge variant="destructive">{lutSummary.renewalDue} due</Badge>}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Package className="w-4 h-4" /> Open Imports</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground font-mono">—</div>
            <div className="text-xs text-muted-foreground mt-1">Wires up at EX-6 (Bill of Entry)</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Globe className="w-4 h-4" /> Open Exports</CardTitle></CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-muted-foreground font-mono">—</div>
            <div className="text-xs text-muted-foreground mt-1">Wires up at EX-7a (Export PO)</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle>Quick Actions</CardTitle></CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Button variant="outline" className="justify-start" onClick={() => onNavigate('eximx-import')}>
              <Package className="w-4 h-4 mr-2" /> Open Import sub-module
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onNavigate('eximx-export')}>
              <Globe className="w-4 h-4 mr-2" /> Open Export sub-module
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onNavigate('eximx-unified')}>
              <ArrowUpRight className="w-4 h-4 mr-2" /> Open Unified view
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onNavigate('eximx-import')}>
              <Award className="w-4 h-4 mr-2" /> IEC Master · register / renew
            </Button>
            <Button variant="outline" className="justify-start" onClick={() => onNavigate('eximx-export')}>
              <FileText className="w-4 h-4 mr-2" /> LUT Master · 7-state workflow
            </Button>
            <Button variant="outline" className="justify-start" disabled>
              <BarChart3 className="w-4 h-4 mr-2" /> EximX Reports (EX-11)
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-accent/30 border-accent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-primary" />
            Saathi · Vendor AI · TDL Gaps Atlas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            Operix&apos;s TDL Gaps Atlas is the institutional moat catalog — the architectural fingerprint of every Tally TDL field
            we fill against the gaps Tally itself leaves open. Saathi explains the 3-bucket Duty Structure (Customs · Other · GST)
            and walks through CTH × Country × Date drill. Click below for the educational preview.
          </p>
          <Button onClick={() => onNavigate('saathi-tdl-gaps-atlas')}>
            <Bot className="w-4 h-4 mr-2" /> Open TDL Gaps Atlas Preview
          </Button>
        </CardContent>
      </Card>

      <div className="text-xs text-muted-foreground border-t pt-3">
        EximX v10 FINAL · 19 moats · 17 Q-LOCKS ratified · 12-13 sprint arc · ~17,450-18,750 LOC · ₹50 Cr–₹500 Cr defensible market
      </div>
    </div>
  );
}
