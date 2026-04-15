import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Wrench, Lock, Building2, Factory, ShoppingBag, Truck } from 'lucide-react';


interface ClientProject {
  id: string;
  clientCode: string;
  title: string;
  icon: React.ElementType;
  industry: string;
  description: string;
  status: 'delivered' | 'in-progress' | 'scoping';
}

const PROJECTS: ClientProject[] = [
  {
    id: 'proj-001',
    clientCode: 'CLIENT-001',
    title: 'Custom Procurement & Approval Portal',
    icon: Building2,
    industry: 'Large Manufacturing',
    description: 'Multi-level purchase approval workflow with vendor comparison matrix, budget vs actual tracking, and custom MIS dashboards per department head.',
    status: 'delivered',
  },
  {
    id: 'proj-002',
    clientCode: 'CLIENT-002',
    title: 'Batch Production Tracking & QC Integration',
    icon: Factory,
    industry: 'Pharmaceutical',
    description: 'Batch-level production journal with IPQC checkpoints, yield variance alerts, and auto-generation of batch manufacturing records for regulatory compliance.',
    status: 'in-progress',
  },
  {
    id: 'proj-003',
    clientCode: 'CLIENT-003',
    title: 'Franchise Management & Royalty Engine',
    icon: ShoppingBag,
    industry: 'Retail Franchise',
    description: 'Franchise onboarding, monthly sales reporting portal for franchisees, automated royalty calculation and invoicing based on tiered revenue slabs.',
    status: 'in-progress',
  },
  {
    id: 'proj-004',
    clientCode: 'CLIENT-004',
    title: 'Fleet & Logistics Cost Allocation',
    icon: Truck,
    industry: 'Distribution & Logistics',
    description: 'Vehicle-wise trip costing, fuel consumption tracking, driver expense management, and delivery performance dashboards with customer SLA reporting.',
    status: 'scoping',
  },
];

const STATUS_CONFIG = {
  'delivered':   { label: 'Delivered',    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  'in-progress': { label: 'In Progress',  color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  'scoping':     { label: 'Scoping',      color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' },
};

export function ClientCustomizedPagePanel() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Workspace
        </Button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Wrench className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Client Customized</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Products built specifically for individual clients per their unique requirements.
              These are bespoke builds — not available in the general catalogue.
              Each entry represents a dedicated client engagement.
            </p>
          </div>
        </div>

        {/* Notice */}
        <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
          <Lock className="h-4 w-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-600 dark:text-amber-400">
            Client project details shown here are illustrative. Actual client names and specifics are confidential.
            Full details are accessible only to the assigned project team.
          </p>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{PROJECTS.filter(p => p.status === 'delivered').length}</span> Delivered</span>
          <span><span className="font-semibold text-foreground">{PROJECTS.filter(p => p.status === 'in-progress').length}</span> In Progress</span>
          <span><span className="font-semibold text-foreground">{PROJECTS.filter(p => p.status === 'scoping').length}</span> Scoping</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {PROJECTS.map(proj => {
            const statusConf = STATUS_CONFIG[proj.status];
            return (
              <div
                key={proj.id}
                className="rounded-2xl border bg-card/60 backdrop-blur-xl p-6"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <proj.icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono text-muted-foreground">{proj.clientCode}</span>
                    <Badge className={statusConf.color}>{statusConf.label}</Badge>
                  </div>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{proj.title}</h3>
                <p className="text-xs text-primary/70 font-medium mb-2">{proj.industry}</p>
                <p className="text-sm text-muted-foreground">{proj.description}</p>
              </div>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Interested in a custom build for your organisation? Contact the product team to start a scoping engagement.
        </p>
      </div>
    </div>
  );
}
export default function ClientCustomizedPage() { return <ClientCustomizedPagePanel />; }
