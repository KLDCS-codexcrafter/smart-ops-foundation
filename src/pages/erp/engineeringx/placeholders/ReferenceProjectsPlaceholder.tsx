/**
 * @file        src/pages/erp/engineeringx/placeholders/ReferenceProjectsPlaceholder.tsx
 * @purpose     Reference Projects placeholder · Coming in A.12
 * @who         Engineering · Sales
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-1a · Block E.4
 * @iso         ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-BV Phase 1 mock · FR-30 11/11 header
 * @disciplines FR-30
 * @reuses      EngineeringXModule type · shadcn/ui Card
 * @[JWT]       N/A (placeholder)
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BookMarked, ArrowLeft } from 'lucide-react';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function ReferenceProjectsPlaceholder({ onNavigate }: Props) {
  return (
    <div className="p-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => onNavigate?.('welcome')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <BookMarked className="h-16 w-16 mx-auto text-primary/50" />
          <h2 className="text-2xl font-semibold">Reference Project Library · Coming in A.12</h2>
          <p className="text-muted-foreground">
            Reference Project Library ships in A.12 · consumes ProjX projects (zero-touch on ProjX engine) · re-use past designs.
          </p>
          <p className="text-xs text-muted-foreground/70 pt-2">
            A.10 Foundation · A.11 Drawing Register · A.12 BOM + Reference Library · A.13 AI similarity.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
