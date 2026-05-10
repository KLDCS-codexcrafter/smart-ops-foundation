/**
 * @file        src/pages/erp/engineeringx/placeholders/DrawingEntryPlaceholder.tsx
 * @purpose     Drawing Entry placeholder · Coming in A.11
 * @who         Engineering · Document Controller
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-1a · Block E.3
 * @iso         ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-BV Phase 1 mock · D-NEW-CE 15th consumer at A.11
 * @disciplines FR-30
 * @reuses      EngineeringXModule type · shadcn/ui Card
 * @[JWT]       N/A (placeholder)
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FilePlus, ArrowLeft } from 'lucide-react';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function DrawingEntryPlaceholder({ onNavigate }: Props) {
  return (
    <div className="p-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => onNavigate?.('welcome')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <FilePlus className="h-16 w-16 mx-auto text-primary/50" />
          <h2 className="text-2xl font-semibold">New Drawing · Coming in A.11</h2>
          <p className="text-muted-foreground">
            New Drawing form ships in A.11 · D-NEW-CE FormCarryForwardKit 15th consumer.
          </p>
          <p className="text-xs text-muted-foreground/70 pt-2">
            Foundation (A.10) lays the canonical Drawing data model + engine. A.11 wires entry form.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
