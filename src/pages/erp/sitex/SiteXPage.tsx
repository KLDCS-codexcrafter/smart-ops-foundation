/**
 * @file     SiteXPage.tsx
 * @sprint   T-Phase-1.3-DashboardAudit-Fix · Block C
 * @purpose  Tier 1 #12 (NEW) placeholder page · per Master Plan §51.2 April 30, 2026 LOCK.
 *
 * Status: coming_soon · 0 of 2,500 LOC plan
 * Sprints planned: 1.5.5c-1 / 1.5.5c-2
 * Hard deps: Production (FG) · Dispatch (site delivery) · Triggers: ServiceDesk handover
 */
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Sparkles } from 'lucide-react';

export default function SiteXPage(): JSX.Element {
  return (
    <div className="min-h-screen bg-background">
      <ERPHeader breadcrumbs={[{ label: 'ERP', href: '/erp/dashboard' }, { label: 'SiteX' }]} />
      <div className="container mx-auto p-6 max-w-3xl">
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <MapPin className="h-16 w-16 mx-auto text-primary/50" />
            <h1 className="text-2xl font-bold">SiteX · Coming Soon</h1>
            <p className="text-muted-foreground">
              Site / Installation execution · Daily Progress Report, geo-photos, snag list,
              customer signoff, commissioning report, mobile site engineer pages.
              For turnkey installations.
            </p>
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground pt-4">
              <Sparkles className="h-4 w-4" />
              <span>Tier 1 #12 · planned 2,500 LOC · 2 sub-sprints (1.5.5c-1/2)</span>
            </div>
            <p className="text-xs text-muted-foreground/70 pt-2">
              Depends on: Production (FG) · Dispatch (site delivery) · Triggers: ServiceDesk handover
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
