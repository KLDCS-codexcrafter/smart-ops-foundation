/**
 * @file        src/pages/erp/servicedesk/settings/CallTypeMasterSettings.tsx
 * @purpose     Call Type master · consumes READ-ONLY listActiveCallTypes from servicedesk-engine
 * @sprint      T-Phase-1.C.2 · Block B.4 · MOAT #24 banking
 * @iso        Functional Suitability + Maintainability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { listActiveCallTypes } from '@/lib/servicedesk-engine';

export function CallTypeMasterSettings(): JSX.Element {
  const [callTypes] = useState(() => listActiveCallTypes());

  return (
    <div className="p-6 space-y-4 max-w-4xl">
      <h1 className="text-xl font-bold">Call Type Master</h1>
      <Card className="p-0 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Display Name</TableHead>
              <TableHead>Default Severity</TableHead>
              <TableHead>Assignment</TableHead>
              <TableHead>Lang</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {callTypes.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground text-sm">
                  No call types configured.
                </TableCell>
              </TableRow>
            )}
            {callTypes.map((ct) => (
              <TableRow key={ct.id}>
                <TableCell className="font-mono text-xs">{ct.call_type_code}</TableCell>
                <TableCell>{ct.display_name}</TableCell>
                <TableCell>{ct.default_sla_severity}</TableCell>
                <TableCell>{ct.default_assignment_rule}</TableCell>
                <TableCell>{ct.language_pref}</TableCell>
                <TableCell>
                  <Badge variant={ct.is_active ? 'default' : 'secondary'}>
                    {ct.is_active ? 'Active' : 'Inactive'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
      <p className="text-xs text-muted-foreground">
        {callTypes.length} call types · institutional defaults seeded · custom additions in Phase 2.
      </p>
    </div>
  );
}

export default CallTypeMasterSettings;
