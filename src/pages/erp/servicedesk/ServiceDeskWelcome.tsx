/**
 * @file        src/pages/erp/servicedesk/ServiceDeskWelcome.tsx
 * @purpose     ServiceDesk welcome landing · scope summary · C.1a Foundation placeholder
 * @sprint      T-Phase-1.C.1a · Block F.3 · v2 spec
 */
import { Card } from '@/components/ui/card';
import { Headphones, ListChecks, Users, BarChart3, ShieldCheck, MessageSquare } from 'lucide-react';
import type { ServiceDeskModule } from './ServiceDeskSidebar.types';

interface Props {
  onNavigate: (m: ServiceDeskModule) => void;
}

const TILES = [
  { icon: ListChecks, title: 'AMC Pipeline', description: 'Applicability decision · proposal lifecycle · active contracts · expiring window · renewal cascade. Lands in C.1b.', target: 'amc-applicability-decision' as ServiceDeskModule },
  { icon: Users, title: 'Service Engineers', description: 'Sarathi REUSE pattern · skills · OEM authorizations · location · capacity. Lands in C.1b.', target: 'engineer-list' as ServiceDeskModule },
  { icon: BarChart3, title: 'Reports', description: 'AMC renewal forecast · SLA performance · CSAT (HappyCode 3-channel) · service day book. Lands in C.1d.', target: 'amc-renewal-forecast' as ServiceDeskModule },
  { icon: ShieldCheck, title: 'SLA + Escalation', description: '28-cell matrix · 3-level escalation tree · flash timers. Lands in C.1c.', target: 'sla-matrix' as ServiceDeskModule },
  { icon: MessageSquare, title: 'Tickets', description: 'Omnichannel ticket intake · 4-way repair routing · OTP-gated completion. Lands in C.1c.', target: 'ticket-inbox' as ServiceDeskModule },
];

export function ServiceDeskWelcome({ onNavigate }: Props): JSX.Element {
  return (
    <div className="min-h-screen p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex items-start gap-4">
        <div className="h-12 w-12 rounded-xl bg-orange-500/10 flex items-center justify-center shrink-0">
          <Headphones className="h-6 w-6 text-orange-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold">ServiceDesk · Post-Handover AMC + Service Tickets</h1>
          <p className="text-sm text-muted-foreground mt-1">
            ServiceDesk C.1a Masters Foundation live. AMC Pipeline · Service Tickets · Reports and 27 OOBs land in C.1b-C.1f.
          </p>
        </div>
      </div>
      <Card className="p-6">
        <h2 className="font-semibold mb-3">C.1a Foundation scope (live)</h2>
        <p className="text-sm text-muted-foreground">
          3 ServiceDesk-OWNED masters · 1 NEW CC-OWNED master · 7 NEW CC compliance setting groups · 9 inbound bridges · 12th card on Shell · Sarathi-pattern service-engineer mobile landing scaffolded.
        </p>
      </Card>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {TILES.map((t) => {
          const Icon = t.icon;
          return (
            <Card
              key={t.title}
              className="p-5 cursor-pointer hover:border-primary transition-colors"
              onClick={() => onNavigate(t.target)}
            >
              <div className="flex items-start gap-3">
                <Icon className="h-5 w-5 text-orange-600 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-sm">{t.title}</h3>
                  <p className="text-xs text-muted-foreground mt-1">{t.description}</p>
                </div>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
