/**
 * @file        src/pages/erp/eximx/masters/AEOTierMaster.tsx
 * @purpose     AEO Tier Mapping CRUD master · per-Entity AEO certification · Moat #4 anchor surface
 * @sprint      T-Phase-1.EX-6-BillOfEntry-CustomsDuty-Demurrage-AutoPostedVouchers
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Shield } from 'lucide-react';
import { loadEntityAEOCerts } from '@/lib/aeo-tier-engine';
import type { EntityAEOCertification } from '@/types/aeo-tier-mapping';

export function AEOTierMaster(): JSX.Element {
  const entityCode = 'sinha-steel';
  const [certs, setCerts] = useState<EntityAEOCertification[]>([]);
  useEffect(() => { setCerts(loadEntityAEOCerts(entityCode)); }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">AEO Tier Mapping Master</h1>
        <p className="text-sm text-muted-foreground">Moat #4 · per-Entity AEO certification · per-Port AEO support · fast-track resolution</p>
      </div>

      <Card>
        <CardHeader><CardTitle><Shield className="w-4 h-4 inline mr-2" />Entity AEO Certifications</CardTitle></CardHeader>
        <CardContent>
          {certs.length === 0 ? (
            <p className="text-sm text-muted-foreground">No AEO certifications loaded · Sinha demo entities are pre-classified Tier-2 in seed data · add via Compliance Suite (EX-9)</p>
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Entity</TableHead><TableHead>Tier</TableHead><TableHead>Cert No</TableHead>
                <TableHead>Validity</TableHead><TableHead>Free Days Bonus</TableHead><TableHead>RMS Pre-Bias</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {certs.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-mono">{c.entity_id}</TableCell>
                    <TableCell><Badge variant="default">{c.aeo_tier}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{c.certificate_no}</TableCell>
                    <TableCell className="text-xs font-mono">{c.validity_from} → {c.validity_to}</TableCell>
                    <TableCell className="font-mono">+{c.free_demurrage_days_bonus} days</TableCell>
                    <TableCell><Badge variant="outline">{c.rms_pre_bias}</Badge></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
