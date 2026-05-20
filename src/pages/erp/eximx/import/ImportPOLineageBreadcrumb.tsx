/**
 * @file        src/pages/erp/eximx/import/ImportPOLineageBreadcrumb.tsx
 * @purpose     Drill: ImportPO → Line → CTH → Country → Date → Bucket
 * @sprint      T-Phase-1.EX-3-ImportPO-ForeignVendor-DualRate
 */
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  poNumber?: string;
  lineNo?: number;
  cthCode?: string;
  countryCode?: string;
  effectiveBand?: string;
  bucketKind?: 'customs' | 'other' | 'gst';
}

export function ImportPOLineageBreadcrumb({
  poNumber, lineNo, cthCode, countryCode, effectiveBand, bucketKind,
}: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <Badge variant="outline">ImportPO</Badge>
      {poNumber && (<><ChevronRight className="w-3 h-3" /><Badge variant="outline" className="font-mono">{poNumber}</Badge></>)}
      {lineNo && (<><ChevronRight className="w-3 h-3" /><Badge variant="outline">L{lineNo}</Badge></>)}
      {cthCode && (<><ChevronRight className="w-3 h-3" /><Badge variant="outline" className="font-mono">{cthCode}</Badge></>)}
      {countryCode && (<><ChevronRight className="w-3 h-3" /><Badge variant="outline">{countryCode}</Badge></>)}
      {effectiveBand && (<><ChevronRight className="w-3 h-3" /><Badge variant="secondary">{effectiveBand}</Badge></>)}
      {bucketKind && (<><ChevronRight className="w-3 h-3" /><Badge>{bucketKind.toUpperCase()}</Badge></>)}
    </div>
  );
}
