/**
 * GeographyHub.tsx — 6-tab hub + Quick Setup wizard (India/UAE/Custom)
 * [JWT] All mutations mock. Real wiring on Tuesday.
 */
import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Globe, Map, MapPin, Building2, Anchor, Layers, Zap, CheckCircle2,
  Loader2, ChevronRight, ArrowRight, AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { indianStates, indianDistricts, indianCities } from '@/data/india-geography';
import { countries as worldCountries } from '@/data/world-geography';
import { UAE_EMIRATES, UAE_DISTRICTS, INDIA_REGIONS, UAE_REGIONS } from '@/data/geo-seed-data';

const ls = <T,>(k: string): T[] => { try { return JSON.parse(localStorage.getItem(k)||'[]'); } catch { return []; } };

type SetupTarget = 'india' | 'uae' | null;
type StepStatus = 'pending' | 'running' | 'done' | 'error';

interface SetupStep {
  id: number;
  label: string;
  detail: string;
  status: StepStatus;
  count?: number;
}

export default function GeographyHub() {
  const navigate = useNavigate();
  const [setupTarget, setSetupTarget] = useState<SetupTarget>(null);
  const [steps, setSteps] = useState<SetupStep[]>([]);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedComplete, setSeedComplete] = useState(false);
  const [progress, setProgress] = useState(0);

  const liveCounts = useMemo(() => {
    const lsLen = (k: string) => { try { return JSON.parse(localStorage.getItem(k)||'[]').length; } catch { return 0; } };
    return {
      countries: lsLen('erp_geo_countries'),
      states: lsLen('erp_geo_states'),
      districts: lsLen('erp_geo_districts'),
      cities: lsLen('erp_geo_cities'),
      ports: lsLen('erp_geo_ports'),
      regions: lsLen('erp_geo_regions'),
    };
  }, [seedComplete, isSeeding]);

  function buildIndiaSteps(): SetupStep[] {
    return [
      { id:1, label:'Create India country record', detail:'Code IN, flag 🇮🇳, INR, +91', status:'pending' },
      { id:2, label:'Insert 38 states/UTs', detail:'All Indian states with GST codes', status:'pending', count:38 },
      { id:3, label:'Insert all districts', detail:`${indianDistricts.length} districts from static data`, status:'pending', count:indianDistricts.length },
      { id:4, label:'Insert major cities', detail:`${indianCities.length} cities with categories`, status:'pending', count:indianCities.length },
      { id:5, label:'Seed 8 sales regions', detail:'North/South/East/West/Central/NE/Islands', status:'pending', count:8 },
    ];
  }

  function buildUAESteps(): SetupStep[] {
    return [
      { id:1, label:'Create UAE country record', detail:'Code AE, flag 🇦🇪, AED, +971', status:'pending' },
      { id:2, label:'Insert 7 Emirates', detail:'Abu Dhabi, Dubai, Sharjah + 4 more', status:'pending', count:7 },
      { id:3, label:'Insert business areas', detail:`${UAE_DISTRICTS.length} major business districts`, status:'pending', count:UAE_DISTRICTS.length },
      { id:4, label:'Seed UAE region', detail:'UAE Operations region grouping', status:'pending', count:1 },
    ];
  }

  async function runSetup(target: 'india' | 'uae') {
    const stepList = target === 'india' ? buildIndiaSteps() : buildUAESteps();
    setSteps(stepList);
    setIsSeeding(true);
    setSeedComplete(false);
    setProgress(0);

    for (let i = 0; i < stepList.length; i++) {
      setSteps(prev => prev.map(s => s.id === stepList[i].id ? {...s, status:'running'} : s));
      setProgress(Math.round((i / stepList.length) * 100));
      await new Promise(res => setTimeout(res, 300 + Math.random() * 200));

      // ── Write real data per step ────────────────────────────────────
      if (target === 'india') {
        if (i === 0) {
          const countries = ls<any>('erp_geo_countries');
          if (!countries.find((c: any) => c.code === 'IN')) {
            countries.push({ code:'IN', name:'India', flag:'🇮🇳', dialCode:'+91',
                             currencyCode:'INR', currencySymbol:'₹', capital:'New Delhi',
                             region:'Asia', timezone:'Asia/Kolkata', status:'active' });
            localStorage.setItem('erp_geo_countries', JSON.stringify(countries));
            /* [JWT] POST /api/geography/countries/seed */
          }
        }
        if (i === 1) {
          const existing = ls<any>('erp_geo_states').filter((s: any) => s.countryCode !== 'IN');
          const indiaStates = indianStates.map(s => ({
            code: s.code, name: s.name, countryCode: 'IN',
            gstStateCode: s.gstStateCode, unionTerritory: s.unionTerritory,
            region: '', status: 'active',
          }));
          localStorage.setItem('erp_geo_states', JSON.stringify([...existing, ...indiaStates]));
          /* [JWT] POST /api/geography/states/seed */
        }
        if (i === 2) {
          const existing = ls<any>('erp_geo_districts').filter((d: any) => d.countryCode !== 'IN');
          const dists = indianDistricts.map((d: any) => ({
            code: d.code || d.name.slice(0,6).toUpperCase().replace(/\s/g,''),
            name: d.name, stateCode: d.stateCode || d.state_code || '',
            countryCode: 'IN', headquarters: d.headquarters || '', status: 'active',
          }));
          localStorage.setItem('erp_geo_districts', JSON.stringify([...existing, ...dists]));
          /* [JWT] POST /api/geography/districts/seed */
        }
        if (i === 3) {
          const existing = ls<any>('erp_geo_cities').filter((c: any) => c.countryCode !== 'IN');
          const cities = indianCities.map((c: any) => ({
            code: c.code || c.name.slice(0,6).toUpperCase().replace(/\s/g,''),
            name: c.name, stateCode: c.stateCode || c.state_code || '',
            districtCode: c.districtCode || '', countryCode: 'IN',
            category: c.category || 'tier2', isMajor: ['metro','tier1'].includes(c.category || ''),
            status: 'active',
          }));
          localStorage.setItem('erp_geo_cities', JSON.stringify([...existing, ...cities]));
          /* [JWT] POST /api/geography/cities/seed */
        }
        if (i === 4) {
          const existing = ls<any>('erp_geo_regions').filter((r: any) => r.countryCode !== 'IN');
          const regions = INDIA_REGIONS.map((r: any) => ({
            code: r.code, name: r.name, countryCode: 'IN',
            states: r.states || [], status: 'active',
          }));
          localStorage.setItem('erp_geo_regions', JSON.stringify([...existing, ...regions]));
          /* [JWT] POST /api/geography/regions/seed */
        }
      }

      if (target === 'uae') {
        if (i === 0) {
          const countries = ls<any>('erp_geo_countries');
          if (!countries.find((c: any) => c.code === 'AE')) {
            countries.push({ code:'AE', name:'United Arab Emirates', flag:'🇦🇪', dialCode:'+971',
                             currencyCode:'AED', currencySymbol:'د.إ', capital:'Abu Dhabi',
                             region:'Middle East', timezone:'Asia/Dubai', status:'active' });
            localStorage.setItem('erp_geo_countries', JSON.stringify(countries));
            /* [JWT] POST /api/geography/countries/seed */
          }
        }
        if (i === 1) {
          const existing = ls<any>('erp_geo_states').filter((s: any) => s.countryCode !== 'AE');
          const emirates = UAE_EMIRATES.map((e: any) => ({
            code: e.code, name: e.name, countryCode: 'AE',
            gstStateCode: '', unionTerritory: false, region: 'Middle East', status: 'active',
          }));
          localStorage.setItem('erp_geo_states', JSON.stringify([...existing, ...emirates]));
          /* [JWT] POST /api/geography/states/seed */
        }
        if (i === 2) {
          const existing = ls<any>('erp_geo_districts').filter((d: any) => d.countryCode !== 'AE');
          const dists = UAE_DISTRICTS.map((d: any) => ({
            code: d.code || d.name.slice(0,6).toUpperCase().replace(/\s/g,''),
            name: d.name, stateCode: d.emirateCode || d.stateCode || '', countryCode: 'AE',
            headquarters: '', status: 'active',
          }));
          localStorage.setItem('erp_geo_districts', JSON.stringify([...existing, ...dists]));
          /* [JWT] POST /api/geography/districts/seed */
        }
        if (i === 3) {
          const existing = ls<any>('erp_geo_regions').filter((r: any) => r.countryCode !== 'AE');
          const regions = UAE_REGIONS.map((r: any) => ({
            code: r.code, name: r.name, countryCode: 'AE',
            states: r.states || [], status: 'active',
          }));
          localStorage.setItem('erp_geo_regions', JSON.stringify([...existing, ...regions]));
          /* [JWT] POST /api/geography/regions/seed */
        }
      }

      setSteps(prev => prev.map(s => s.id === stepList[i].id ? {...s, status:'done'} : s));
    }

    setProgress(100);
    setIsSeeding(false);
    setSeedComplete(true);
    toast.success(`${target === 'india' ? 'India' : 'UAE'} geography setup complete!`);
  }

  function openSetup(target: 'india' | 'uae') {
    setSetupTarget(target);
    setSteps([]);
    setSeedComplete(false);
    setProgress(0);
  }

  const TAB_META = [
    { key:'countries', icon:Globe, label:'Countries', path:'/erp/foundation/geography/countries' },
    { key:'states', icon:Map, label:'States', path:'/erp/foundation/geography/states' },
    { key:'districts', icon:MapPin, label:'Districts', path:'/erp/foundation/geography/districts' },
    { key:'cities', icon:Building2, label:'Cities', path:'/erp/foundation/geography/cities' },
    { key:'ports', icon:Anchor, label:'Ports', path:'/erp/foundation/geography/ports' },
    { key:'regions', icon:Layers, label:'Regions', path:'/erp/foundation/geography/regions' },
  ];

  const CHIP_STYLES = [
    'text-blue-600 bg-blue-500/10 border-blue-500/20',
    'text-emerald-600 bg-emerald-500/10 border-emerald-500/20',
    'text-amber-600 bg-amber-500/10 border-amber-500/20',
    'text-purple-600 bg-purple-500/10 border-purple-500/20',
    'text-indigo-600 bg-indigo-500/10 border-indigo-500/20',
    'text-teal-600 bg-teal-500/10 border-teal-500/20',
  ];

  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background">
        <ERPHeader
          breadcrumbs={[
            { label:'Operix Core', href:'/erp/dashboard' },
            { label:'Command Center', href:'/erp/command-center' },
            { label:'Foundation' },
            { label:'Geography Masters' },
          ]}
          showDatePicker={false} showCompany={false}
        />

        <main className="p-6 space-y-6">
          {/* Header row */}
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-foreground">Geography Masters</h1>
              <p className="text-sm text-muted-foreground">
                Set up the address spine for the entire ERP — countries, states, districts, cities, ports, and regions.
              </p>
            </div>

            {/* Quick Setup buttons */}
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => openSetup('india')} className="gap-1.5">
                <Zap className="h-4 w-4" /> Setup India
              </Button>
              <Button onClick={() => openSetup('uae')} className="gap-1.5" variant="secondary">
                <Zap className="h-4 w-4" /> Setup UAE
              </Button>
              <Button
                variant="outline"
                onClick={() => navigate('/erp/foundation/geography/countries')}
                className="gap-1.5"
              >
                <Globe className="h-4 w-4" /> Add Country
              </Button>
            </div>
          </div>

          {/* Count chips */}
          <div className="flex flex-wrap gap-2">
            {TAB_META.map((tab, idx) => {
              const Icon = tab.icon;
              const count = (liveCounts as Record<string, number>)[tab.key] ?? 0;
              return (
                <Badge key={tab.key} variant="outline" className={cn('text-xs gap-1 py-1 px-2', CHIP_STYLES[idx])}>
                  <Icon className="h-3 w-3" />
                  {count} {tab.label}
                </Badge>
              );
            })}
          </div>

          {/* 6-tab section */}
          <Tabs defaultValue="countries" className="space-y-4">
            <TabsList className="flex flex-wrap h-auto gap-1">
              <TabsTrigger value="countries" className="gap-1"><Globe className="h-3.5 w-3.5" /> 🌍 Countries</TabsTrigger>
              <TabsTrigger value="states" className="gap-1"><Map className="h-3.5 w-3.5" /> States</TabsTrigger>
              <TabsTrigger value="districts" className="gap-1"><MapPin className="h-3.5 w-3.5" /> Districts</TabsTrigger>
              <TabsTrigger value="cities" className="gap-1"><Building2 className="h-3.5 w-3.5" /> Cities</TabsTrigger>
              <TabsTrigger value="ports" className="gap-1"><Anchor className="h-3.5 w-3.5" /> 🚢 Ports</TabsTrigger>
              <TabsTrigger value="regions" className="gap-1"><Layers className="h-3.5 w-3.5" /> Regions</TabsTrigger>
            </TabsList>

            {/* Countries tab */}
            <TabsContent value="countries" className="space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {liveCounts.countries} countries configured
                </p>
                <Button size="sm" onClick={() => navigate('/erp/foundation/geography/countries')}>
                  <ArrowRight className="h-4 w-4 mr-1" /> Manage Countries
                </Button>
              </div>
              {liveCounts.countries === 0 ? (
                <div className="border rounded-lg p-8 text-center space-y-3">
                  <Globe className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">No countries configured</p>
                  <p className="text-xs text-muted-foreground">
                    Click "Setup India" or "Setup UAE" to get started instantly.
                  </p>
                  <div className="flex justify-center gap-2">
                    <Button size="sm" variant="outline" onClick={() => openSetup('india')}>Setup India</Button>
                    <Button size="sm" variant="outline" onClick={() => openSetup('uae')}>Setup UAE</Button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">Use the Manage Countries page to view and edit records.</p>
              )}
            </TabsContent>

            {/* Other tabs — same empty-state + Manage button pattern */}
            {['states','districts','cities','ports','regions'].map(tab => (
              <TabsContent key={tab} value={tab} className="space-y-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    {(liveCounts as Record<string,number>)[tab]} {tab} configured
                  </p>
                  <Button size="sm" onClick={() => navigate(`/erp/foundation/geography/${tab}`)}>
                    <ArrowRight className="h-4 w-4 mr-1" /> Manage {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  </Button>
                </div>
                <div className="border rounded-lg p-8 text-center space-y-3">
                  <AlertCircle className="h-10 w-10 text-muted-foreground mx-auto" />
                  <p className="text-sm text-muted-foreground">
                    Use "Setup India" or "Setup UAE" to populate, or manage records directly.
                  </p>
                </div>
              </TabsContent>
            ))}
          </Tabs>

          {/* Quick Setup Wizard Dialog */}
          <Dialog open={!!setupTarget} onOpenChange={o => { if (!o && !isSeeding) setSetupTarget(null); }}>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Quick Setup — {setupTarget === 'india' ? '🇮🇳 India' : '🇦🇪 UAE'}
                </DialogTitle>
                <DialogDescription>
                  {setupTarget === 'india'
                    ? 'Creates India country record, 38 states/UTs, districts, major cities, and 8 sales regions.'
                    : 'Creates UAE country record, 7 Emirates, business areas, and UAE Operations region.'}
                </DialogDescription>
              </DialogHeader>

              {steps.length === 0 && !seedComplete && (
                <div className="py-6 text-center space-y-4">
                  <p className="text-sm text-muted-foreground">
                    This will seed {setupTarget === 'india' ? 'all Indian' : 'all UAE'} geography data.
                    Ready to start?
                  </p>
                  <Button onClick={() => setupTarget && runSetup(setupTarget)} className="gap-1.5">
                    <Zap className="h-4 w-4" /> Start Setup
                  </Button>
                </div>
              )}

              {steps.length > 0 && (
                <div className="space-y-3 py-2">
                  <Progress value={progress} className="h-2" />
                  <div className="space-y-2">
                    {steps.map(step => (
                      <div key={step.id} className={cn(
                        'flex items-start gap-3 p-2 rounded-lg text-sm transition-colors',
                        step.status === 'running' && 'bg-primary/5',
                        step.status === 'done' && 'bg-emerald-500/5',
                      )}>
                        <div className="mt-0.5">
                          {step.status === 'pending' && <div className="h-4 w-4 rounded-full border border-muted-foreground/30" />}
                          {step.status === 'running' && <Loader2 className="h-4 w-4 text-primary animate-spin" />}
                          {step.status === 'done' && <CheckCircle2 className="h-4 w-4 text-emerald-500" />}
                          {step.status === 'error' && <AlertCircle className="h-4 w-4 text-destructive" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-foreground">{step.label}</p>
                          <p className="text-xs text-muted-foreground">{step.detail}</p>
                        </div>
                        {step.count != null && step.status === 'done' && (
                          <Badge variant="outline" className="text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                            {step.count} rows
                          </Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {seedComplete && (
                <DialogFooter className="gap-2 sm:gap-0">
                  <Button variant="outline" onClick={() => setSetupTarget(null)}>Close</Button>
                  <Button onClick={() => navigate('/erp/foundation/geography/countries')}>
                    <ChevronRight className="h-4 w-4 mr-1" /> View Countries
                  </Button>
                </DialogFooter>
              )}
            </DialogContent>
          </Dialog>
        </main>
      </div>
    </SidebarProvider>
  );
}
