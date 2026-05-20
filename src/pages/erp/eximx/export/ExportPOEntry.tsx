/**
 * @file        src/pages/erp/eximx/export/ExportPOEntry.tsx
 * @purpose     New Export PO entry · cross-master validation (LUT + IEC + ForeignCustomer + Country + ForexRate)
 * @sprint      T-Phase-1.EX-7a-ExportPO-ForeignCustomer-DocPack
 */
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { AlertTriangle } from 'lucide-react';

export function ExportPOEntry(): JSX.Element {
  const navigate = useNavigate();
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">New Export Purchase Order</h1>
      <Card>
        <CardHeader><CardTitle>Cross-Master Validation Required</CardTitle></CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>Before creating an Export PO, ensure all 5 masters are ready:</p>
          <ul className="list-disc list-inside space-y-1">
            <li><strong>IEC Master</strong> · valid Indian importer-exporter code</li>
            <li><strong>LUT Master</strong> · status must be <code>active</code> (Q3=a hard gate)</li>
            <li><strong>Foreign Customer Master</strong> · buyer record with reliability score</li>
            <li><strong>Country</strong> · drives doc-pack rule (UAE legalized · EU EUR.1 · ASEAN Form AI · GSP Form A)</li>
            <li><strong>ForexRate</strong> · selling_rate for INR conversion</li>
          </ul>
          <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/30 rounded text-warning-foreground">
            <AlertTriangle className="w-4 h-4 text-warning" />
            <span className="text-xs">Full entry form scaffolded in EX-7b alongside Shipping Bill workflow · in EX-7a, see existing Sinha demo POs to understand the data model.</span>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => navigate('/erp/eximx/export/orders')}>Back to List</Button>
            <Button variant="outline" onClick={() => navigate('/erp/eximx/export/foreign-customers')}>Manage Foreign Customers</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
