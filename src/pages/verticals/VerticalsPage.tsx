import { useNavigate } from 'react-router-dom';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Stethoscope, GraduationCap, Hotel, Building2, Wheat, FlaskConical } from 'lucide-react';
import { cn } from '@/lib/utils';

type VerticalPhase = 'live' | 'phase2' | 'planned';

interface Vertical {
  id: string;
  title: string;
  icon: React.ElementType;
  description: string;
  details: string;
  route: string;
  phase: VerticalPhase;
}

const VERTICALS: Vertical[] = [
  {
    id: 'hospital',
    title: 'Hospital Management',
    icon: Stethoscope,
    description: 'Complete Hospital Information System — OPD, IPD, pharmacy, billing, lab, ward management.',
    details: 'Full patient lifecycle: registration → consultation → admission → discharge → billing. Integrates with lab equipment, pharmacy dispensing, and insurance claim processing.',
    route: '/verticals/hospital',
    phase: 'planned',
  },
  {
    id: 'school',
    title: 'School & Education ERP',
    icon: GraduationCap,
    description: 'End-to-end school management — admissions, fee collection, timetable, attendance, results.',
    details: 'Covers pre-school to higher secondary. Parent portal, SMS/WhatsApp alerts, transport management, hostel, library, and examination modules included.',
    route: '/verticals/school',
    phase: 'planned',
  },
  {
    id: 'hotel',
    title: 'Hotel & Hospitality',
    icon: Hotel,
    description: 'Property management for hotels, resorts and service apartments — front desk, housekeeping, F&B.',
    details: 'Room reservations, check-in/check-out, housekeeping workflow, banquet management, restaurant POS, and channel manager integration.',
    route: '/verticals/hotel',
    phase: 'planned',
  },
  {
    id: 'clinic',
    title: 'Clinic & Pharmacy',
    icon: FlaskConical,
    description: 'Clinic management with integrated pharmacy — prescriptions, dispensing, inventory, billing.',
    details: 'Multi-specialty clinic support. Doctor scheduling, e-prescription, drug interaction alerts, pharmacy stock with expiry tracking, and NABH-ready reports.',
    route: '/verticals/clinic',
    phase: 'planned',
  },
  {
    id: 'construction',
    title: 'Construction & Real Estate',
    icon: Building2,
    description: 'Project costing, BOQ management, subcontractor billing, and site progress tracking.',
    details: 'Labour contractor billing, material at site, project-wise P&L, retention management, and customer booking management for real estate developers.',
    route: '/verticals/construction',
    phase: 'planned',
  },
  {
    id: 'agriculture',
    title: 'Agriculture & Agri-Processing',
    icon: Wheat,
    description: 'Farm management, mandi purchases, crop processing, and commodity trading operations.',
    details: 'Farmer ledgers, mandi purchase vouchers, moisture/quality grading, cold storage management, and APMC compliance reporting.',
    route: '/verticals/agriculture',
    phase: 'planned',
  },
];

const PHASE_CONFIG: Record<VerticalPhase, { label: string; color: string }> = {
  live:    { label: 'Live',     color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300' },
  phase2:  { label: 'Phase 2', color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300' },
  planned: { label: 'Planned', color: 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400' },
};

export default function VerticalsPage() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-6">

        <Button variant="ghost" size="sm" onClick={() => navigate('/welcome')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Workspace
        </Button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <Building2 className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Vertical</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Industry-specific ERP systems built for sectors beyond core manufacturing and trading.
              Each vertical is a complete, standalone product with its own workflows, compliance, and reports.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span><span className="font-semibold text-foreground">{VERTICALS.filter(v => v.phase === 'live').length}</span> Live</span>
          <span><span className="font-semibold text-foreground">{VERTICALS.filter(v => v.phase === 'phase2').length}</span> Phase 2</span>
          <span><span className="font-semibold text-foreground">{VERTICALS.filter(v => v.phase === 'planned').length}</span> Planned</span>
        </div>

        <div className="grid sm:grid-cols-2 gap-4">
          {VERTICALS.map(v => {
            const phaseConf = PHASE_CONFIG[v.phase];
            const isClickable = v.phase === 'live';
            return (
              <button
                key={v.id}
                onClick={() => isClickable && navigate(v.route)}
                className={cn(
                  "group relative rounded-2xl border bg-card/60 backdrop-blur-xl p-6 text-left w-full transition-all duration-300",
                  isClickable
                    ? "hover:scale-[1.02] hover:border-primary/40 cursor-pointer"
                    : "opacity-70 cursor-default"
                )}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <v.icon className="h-5 w-5 text-primary" />
                  </div>
                  <Badge className={phaseConf.color}>{phaseConf.label}</Badge>
                </div>
                <h3 className="font-semibold text-foreground mb-1">{v.title}</h3>
                <p className="text-sm text-muted-foreground mb-2">{v.description}</p>
                <p className="text-xs text-muted-foreground/70">{v.details}</p>
              </button>
            );
          })}
        </div>

        <p className="text-xs text-muted-foreground text-center pt-4">
          Vertical availability depends on market demand and development roadmap. Contact sales for priority access.
        </p>
      </div>
    </div>
  );
}
