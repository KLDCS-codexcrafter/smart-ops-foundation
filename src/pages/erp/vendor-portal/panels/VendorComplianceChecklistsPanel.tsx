/**
 * @file        VendorComplianceChecklistsPanel.tsx
 * @sprint      T-VPG-VendorPortal-Gaps
 */
import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { ListChecks } from 'lucide-react';
import { listChecklists } from '@/lib/vendor-risk-compliance-engine';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import type { VendorComplianceChecklist } from '@/types/vendor-compliance-checklist';

export function VendorComplianceChecklistsPanel(): JSX.Element {
  const entityCode = DEFAULT_ENTITY_SHORTCODE;
  const [lists, setLists] = useState<VendorComplianceChecklist[]>([]);
  useEffect(() => { setLists(listChecklists(entityCode)); }, [entityCode]);

  return (
    <div className="space-y-4 animate-fade-in">
      <h1 className="text-2xl font-bold flex items-center gap-2">
        <ListChecks className="w-6 h-6" /> Compliance Checklists
      </h1>
      {lists.length === 0 ? (
        <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">
          No checklists computed. Build one per vendor from the engine.
        </CardContent></Card>
      ) : (
        <div className="grid gap-3">
          {lists.map((cl) => (
            <Card key={cl.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base font-mono">{cl.party_id}</CardTitle>
                  <Badge variant="outline" className="font-mono">{cl.completion_percent}%</Badge>
                </div>
                <Progress value={cl.completion_percent} className="mt-2" />
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm">
                  {cl.items.map((it) => (
                    <div key={it.key} className="flex items-center justify-between border rounded-lg p-2">
                      <span>{it.label}{it.is_mandatory ? ' *' : ''}</span>
                      <Badge variant={it.status === 'satisfied' ? 'default' : 'outline'} className="text-xs">
                        {it.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
