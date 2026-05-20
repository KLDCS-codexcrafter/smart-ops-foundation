/**
 * @file        src/pages/erp/eximx/import/MultiLegGITLineageBreadcrumb.tsx
 * @purpose     Lineage breadcrumb: ImportPO → MLGIT → Leg → Bucket
 * @sprint      T-Phase-1.EX-4-MultiLeg-GIT-3Bucket-4Method
 */
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props { poNumber?: string; mlgitNumber?: string; legNo?: number; bucket?: string; }

export function MultiLegGITLineageBreadcrumb({ poNumber, mlgitNumber, legNo, bucket }: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <Badge variant="outline">ImportPO</Badge>
      {poNumber && <><ChevronRight className="w-3 h-3" /><Badge variant="outline" className="font-mono">{poNumber}</Badge></>}
      <ChevronRight className="w-3 h-3" /><Badge variant="outline">MLGIT</Badge>
      {mlgitNumber && <><ChevronRight className="w-3 h-3" /><Badge variant="outline" className="font-mono">{mlgitNumber}</Badge></>}
      {legNo && <><ChevronRight className="w-3 h-3" /><Badge variant="outline">Leg {legNo}</Badge></>}
      {bucket && <><ChevronRight className="w-3 h-3" /><Badge>{bucket}</Badge></>}
    </div>
  );
}
