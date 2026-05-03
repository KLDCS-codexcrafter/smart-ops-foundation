/**
 * @file        DepartmentMasterReadOnly.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block D · D-238
 * @purpose     Read-only Department list · sourced from canonical OrgStructure SSOT.
 */
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { ExternalLink } from 'lucide-react';
import { useOrgStructure } from '@/hooks/useOrgStructure';
import { inrFmt } from '@/lib/requestx-report-engine';

export function DepartmentMasterReadOnlyPanel(): JSX.Element {
  const { departments, divisions } = useOrgStructure();

  const rows = departments.map(d => ({
    ...d,
    division_name: divisions.find(v => v.id === d.division_id)?.name ?? '—',
  }));

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold">Department Master</h1>
          <p className="text-xs text-muted-foreground max-w-2xl">
            Read-only · SSOT lives in Command Center → Business Units. Edit there to keep all modules
            (RequestX · Procure360 · Pay Hub · ProjX) in sync. Prevents drift across cards.
          </p>
        </div>
        <Button
          variant="outline"
          onClick={() => { window.location.href = '/erp/command-center#org-structure'; }}
        >
          <ExternalLink className="h-4 w-4 mr-2" /> Manage in Command Center
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Departments ({rows.length})</CardTitle></CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Division</TableHead>
                <TableHead>HOD</TableHead>
                <TableHead className="text-right">Budget</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-xs text-muted-foreground">
                    No departments yet. Run entity setup (Command Center) to seed industry presets.
                  </TableCell>
                </TableRow>
              )}
              {rows.map(d => (
                <TableRow key={d.id}>
                  <TableCell className="font-mono text-xs">{d.code}</TableCell>
                  <TableCell className="text-xs">{d.name}</TableCell>
                  <TableCell className="text-xs">{d.division_name}</TableCell>
                  <TableCell className="text-xs">{d.head_name || '—'}</TableCell>
                  <TableCell className="font-mono text-xs text-right">
                    {d.budget != null ? inrFmt(d.budget) : '—'}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[10px]">{d.status}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
