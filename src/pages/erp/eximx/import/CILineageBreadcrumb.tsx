/**
 * @file        src/pages/erp/eximx/import/CILineageBreadcrumb.tsx
 * @purpose     Lineage breadcrumb: ImportPO → MLGIT → CI → Line → Part
 * @sprint      T-Phase-1.EX-5-CommercialInvoice-6PartAllocation-CIFWaterfall
 */
import { ChevronRight } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Props {
  poNumber?: string;
  mlgitNumber?: string | null;
  ciNumber?: string;
  lineNo?: number;
  part?: 'A' | 'B' | 'C' | 'D' | 'E' | 'F';
}

export function CILineageBreadcrumb({ poNumber, mlgitNumber, ciNumber, lineNo, part }: Props): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-xs flex-wrap">
      <Badge variant="outline">ImportPO</Badge>
      {poNumber && <><ChevronRight className="w-3 h-3" /><Badge variant="outline" className="font-mono">{poNumber}</Badge></>}
      <ChevronRight className="w-3 h-3" /><Badge variant="outline">MLGIT</Badge>
      {mlgitNumber && <><ChevronRight className="w-3 h-3" /><Badge variant="outline" className="font-mono">{mlgitNumber}</Badge></>}
      <ChevronRight className="w-3 h-3" /><Badge variant="outline">CI</Badge>
      {ciNumber && <><ChevronRight className="w-3 h-3" /><Badge variant="outline" className="font-mono">{ciNumber}</Badge></>}
      {lineNo !== undefined && <><ChevronRight className="w-3 h-3" /><Badge variant="outline">Line {lineNo}</Badge></>}
      {part && <><ChevronRight className="w-3 h-3" /><Badge>Part {part}</Badge></>}
    </div>
  );
}
