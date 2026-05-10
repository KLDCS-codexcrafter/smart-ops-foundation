/**
 * @file        src/pages/erp/engineeringx/placeholders/DrawingRegisterPlaceholder.tsx
 * @purpose     Drawing Register placeholder · Coming in A.11
 * @who         Engineering · Production · Procurement
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.10 EngineeringX Foundation · Q-LOCK-1a · Block E.2
 * @iso         ISO 25010 Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-BV Phase 1 mock · FR-30 11/11 header
 * @disciplines FR-30
 * @reuses      EngineeringXModule type · shadcn/ui Card
 * @[JWT]       N/A (placeholder)
 */
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, ArrowLeft } from 'lucide-react';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function DrawingRegisterPlaceholder({ onNavigate }: Props) {
  return (
    <div className="p-6 max-w-2xl">
      <Button variant="ghost" size="sm" onClick={() => onNavigate?.('welcome')} className="mb-4">
        <ArrowLeft className="h-4 w-4 mr-1" /> Back
      </Button>
      <Card>
        <CardContent className="p-12 text-center space-y-4">
          <FileText className="h-16 w-16 mx-auto text-primary/50" />
          <h2 className="text-2xl font-semibold">Drawing Register · Coming in A.11</h2>
          <p className="text-muted-foreground">
            Sprint A.11 ships drawing register with version control · approval workflow · project filter.
          </p>
          <p className="text-xs text-muted-foreground/70 pt-2">
            Foundation (A.10) lays the canonical Drawing data model + engine. A.11 wires UI panels.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
