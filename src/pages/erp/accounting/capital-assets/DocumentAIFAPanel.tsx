/**
 * DocumentAIFAPanel.tsx — Sprint 68 FAR-4 Prompt A Block 5 thin glue
 */
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { extractInvoice, validateGST, type InvoiceExtraction, type GSTValidationResult } from '@/lib/document-ai-fa-engine';

interface Props { entityCode: string }

export function DocumentAIFAPanel(_props: Props) {
  const [extraction, setExtraction] = useState<InvoiceExtraction | null>(null);
  const [validation, setValidation] = useState<GSTValidationResult | null>(null);

  const handleFile = async (file: File) => {
    const buf = await file.arrayBuffer();
    const ex = await extractInvoice(buf);
    setExtraction(ex);
    setValidation(validateGST(ex));
  };

  return (
    <div className="p-6 space-y-4">
      <Card>
        <CardHeader><CardTitle>Document AI · Invoice → FA</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <input
            type="file"
            accept="application/pdf,text/plain"
            onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="text-sm"
          />
          {extraction && (
            <div className="space-y-2 text-sm font-mono pt-2 border-t border-border/50">
              <div>GSTIN: {extraction.vendor_gstin ?? '—'}</div>
              <div>Invoice #: {extraction.invoice_number ?? '—'}</div>
              <div>Total: ₹{extraction.total_amount?.toLocaleString('en-IN') ?? '—'}</div>
              <div>Confidence: {(extraction.extraction_confidence * 100).toFixed(0)}%</div>
            </div>
          )}
          {validation && (
            <div className="space-y-1 pt-2">
              <Badge variant={validation.is_valid ? 'default' : 'destructive'}>
                {validation.is_valid ? 'GST Valid' : 'GST Issues'}
              </Badge>
              {validation.errors.map((e, i) => (
                <p key={`err-${i}`} className="text-xs text-destructive">{e}</p>
              ))}
              {validation.warnings.map((w, i) => (
                <p key={`warn-${i}`} className="text-xs text-warning">{w}</p>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
