/**
 * @file        src/pages/erp/eximx/masters/CTHLineageBreadcrumb.tsx
 * @purpose     Drill breadcrumb · CTH → Country → Date band → 3 Bucket · matches D-NEW-ES pattern
 * @sprint      T-Phase-1.EX-2-CTH-Country-Date-Master
 */
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface CTHLineageProps {
  cthCode?: string;
  countryCode?: string;
  effectiveBand?: string;
  bucketKind?: 'customs' | 'other' | 'gst';
}

export function CTHLineageBreadcrumb({
  cthCode,
  countryCode,
  effectiveBand,
  bucketKind,
}: CTHLineageProps): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <Badge variant="outline">CTH</Badge>
      {cthCode && (
        <>
          <ChevronRight className="w-3 h-3" />
          <Badge variant="outline" className="font-mono">{cthCode}</Badge>
        </>
      )}
      {countryCode && (
        <>
          <ChevronRight className="w-3 h-3" />
          <Badge variant="outline">{countryCode}</Badge>
        </>
      )}
      {effectiveBand && (
        <>
          <ChevronRight className="w-3 h-3" />
          <Badge variant="secondary" className="font-mono">{effectiveBand}</Badge>
        </>
      )}
      {bucketKind && (
        <>
          <ChevronRight className="w-3 h-3" />
          <Badge>{bucketKind.toUpperCase()}</Badge>
        </>
      )}
    </div>
  );
}
