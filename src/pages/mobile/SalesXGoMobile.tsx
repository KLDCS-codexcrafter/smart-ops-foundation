/**
 * SalesXGoMobile.tsx — Mobile blueprint for SalesX Field Force
 * Sprint 7 v2 · Mirrors VetanNidhiMobile structure
 * [JWT] none — pure presentation
 */
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import {
  Smartphone, ArrowLeft, CheckCircle2, FileText, Navigation, MapPin,
  Camera, ShoppingBag, Target, IndianRupee, BellRing, Users, BarChart3,
  ClipboardList, Package, Layers,
} from 'lucide-react';

const FIELD_FORCE_FEATURES = [
  { icon: Navigation, title: "Today's Beat",
    desc: "Single-tap view of today's planned beat. Stops in route sequence with customer name, address, and last-visit age. Big Check In button on each stop — hands-free operation on the go." },
  { icon: MapPin, title: 'Geo Check-In with Radius',
    desc: 'Real GPS-backed check-in. Enforced 500m radius around customer registered location — if you are outside, check-in is rejected. Prevents cheating (salesman checking in from home). Accuracy metres displayed for transparency.' },
  { icon: Camera, title: 'Photo Capture on Visit',
    desc: 'Attach up to 3 photos per visit — display, competition pricing, damaged stock. Photos geotagged and timestamped. Compressed on-device before upload to save data cost.' },
  { icon: FileText, title: 'Visit Outcome Logging',
    desc: 'After each visit: purpose, outcome (Order Captured / Follow-up / Sample Given / Customer Not Available / ...), notes, next visit date. Order value captured on the spot — flows into Pipeline and Sales Orders.' },
  { icon: ShoppingBag, title: 'Secondary Sales Capture',
    desc: 'Distributor staff can log secondary sales (sell-through to sub-dealers) directly from the app. Items from catalog, qty, rate, end-customer name — takes 30 seconds per entry. Feeds Secondary Sales Reports and Scheme calculations.' },
  { icon: Target, title: 'My Target Progress',
    desc: 'Live target vs achievement for the month. Product-wise and overall. Daily tracker — amber when pacing below plan, green when ahead. Helps self-motivation without manager nagging.' },
  { icon: IndianRupee, title: 'My Commission & Bonus',
    desc: 'Live commission earned this month. Breakdown: base commission (from invoices) + collection bonus (from receipts within window) + scheme earnings. TDS deducted and net payable visible. No more guesswork.' },
  { icon: BellRing, title: 'Push Notifications',
    desc: 'Get notified when a customer requests a new visit, when an enquiry gets auto-assigned, when a PTP is due for collection follow-up, when your target achievement crosses 75/90/100%.' },
];

const SUPERVISOR_FEATURES = [
  { icon: Users, title: 'Team Coverage Today',
    desc: 'Live dashboard — who is on beat, who has checked in today, who is off schedule. Map view of active check-ins. Alerts on salesmen with zero check-ins by 11 AM.' },
  { icon: BarChart3, title: 'Beat Productivity Dashboard',
    desc: 'Per-beat completion % for the week. Conversion rate from visits to orders. Flag under-performing beats for re-routing.' },
  { icon: ClipboardList, title: 'Visit Log Review',
    desc: 'Scroll through team visit logs in reverse-chronological order. Filter by salesman, outcome, date range. Drill into any log for photos, notes, geo accuracy.' },
  { icon: Target, title: 'Target Setting + Adjustment',
    desc: 'Set and adjust monthly targets per salesman from the phone. Push target changes — salesman sees updated target instantly in their app.' },
  { icon: CheckCircle2, title: 'Visit Log Correction Approval',
    desc: 'Salesman cannot edit a submitted visit log (append-only rule). Corrections flow through the manager as approval requests. Manager approves or rejects with reason.' },
  { icon: BellRing, title: 'Escalation Alerts',
    desc: 'Push notifications on: customer with 30+ day coverage gap, target achievement < 50% mid-month, secondary sales drop vs previous month, PTP broken by the field team.' },
];

const COMPARE = [
  { feature: 'Primary user',       web: 'Ops Manager / HR',                 field: 'Salesman / Agent / Broker',                  mgr: 'Area / Territory Manager' },
  { feature: 'Territory setup',    web: 'Full CRUD with hierarchy tree',    field: 'View only',                                  mgr: 'View only' },
  { feature: 'Beat planning',      web: 'Full CRUD with drag-reorder',      field: "See today's beat + next 7 days",             mgr: 'See team beats' },
  { feature: 'Customer master',    web: 'Full master',                      field: 'Quick view + call/map link',                 mgr: 'Full view' },
  { feature: 'Visit check-in',     web: 'Not applicable',                   field: 'One-tap with geo + radius',                  mgr: 'Not applicable' },
  { feature: 'Visit outcome',      web: 'Read-only register',               field: 'Log on phone',                               mgr: 'Review + correct via approval' },
  { feature: 'Photo attachments',  web: 'View only',                        field: 'Capture 3 photos per visit',                 mgr: 'View only' },
  { feature: 'Secondary sales',    web: 'Full capture + import',            field: 'Capture on phone at distributor',            mgr: 'Review + approve' },
  { feature: 'Target vs Achv',     web: 'Full report + set targets',        field: 'My targets only, live',                      mgr: 'Team targets, set + adjust' },
  { feature: 'Commission',         web: 'Full register + Pay Agent',        field: 'My earning only',                            mgr: 'Team earning summary' },
  { feature: 'Push notifications', web: 'Not applicable',                   field: 'Visit reminders, target alerts',             mgr: 'Escalation alerts' },
  { feature: 'Offline mode',       web: 'Not applicable',                   field: 'Check-ins cached offline, sync on reconnect', mgr: 'Not applicable' },
  { feature: 'Login type',         web: 'Admin / Ops session',              field: 'SalesX login — person_code + PIN',            mgr: 'Same as Field, manager role' },
];

const PWA_STEPS = [
  { step: 1, title: 'Standalone Auth Shell',
    desc: 'Separate /operix-go/salesx/login route with SalesX scope JWT. Login accepts SAMPerson.person_code + PIN (4-digit, configurable in SAM Config). On success, detect person_type from erp_sam_persons — salesman/agent/broker lands on Field App, manager role lands on Supervisor App. Shared login page.' },
  { step: 2, title: 'SalesX Feature Gate',
    desc: 'Fetch SAMConfig on login. Show or hide features based on toggles (e.g., enableCommissionOnService controls whether commission tab appears). The same Comply360 SAM config already built drives the mobile app — no new config needed.' },
  { step: 3, title: 'Mobile-Responsive Screens',
    desc: "Reuse field-force-engine from Sprint 7 and render mobile-first. Today's Beat as vertical stop cards. Visit check-in as full-screen modal with geo + photo. Visit log as feed. All [JWT]-stubbed for now — wires to real API when backend is ready." },
  { step: 4, title: 'PWA Manifest + Service Worker',
    desc: 'Add public/manifest-salesx-go.json: name SalesX Go Sahayak, short_name SalesXGo, theme_color orange, display standalone, icons 192x192 and 512x512. Register service worker for offline check-in queue. Queued check-ins POST on reconnect. Add-to-Home-Screen browser prompt automatic.' },
  { step: 5, title: 'Push Notifications + Offline Queue',
    desc: 'Web Push API with VAPID keys. Subscribe on login. Server triggers push on visit reminders, target alerts, escalations. Offline queue: check-ins made without connectivity are stored in IndexedDB and flushed on reconnect with original timestamps. Requires backend API — stubbed with [JWT] comment.' },
];

const CAPACITOR_STEPS = [
  { step: 1, title: 'Install Capacitor — zero code changes',
    desc: 'Capacitor wraps the existing React PWA in a native shell. No changes to React code, no second codebase. Run: npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios. Then: npx cap init. The entire SalesX Go PWA becomes the Capacitor web layer unchanged.' },
  { step: 2, title: 'Configure Native Platforms',
    desc: 'npx cap add android generates /android folder. npx cap add ios generates /ios folder (requires macOS + Xcode). Add Capacitor plugins for enhanced native features: @capacitor/geolocation (background tracking), @capacitor/camera (photo capture), @capacitor/push-notifications (replaces Web Push), @capacitor/network (offline detection).' },
  { step: 3, title: 'Build + Sign APK / IPA',
    desc: 'npm run build builds the React app. npx cap sync copies web assets. Open Android Studio or Xcode, set app ID (com.4dsmartops.salesxgo), sign with keystore or Apple certificate, build APK or IPA. Total developer time: 2-3 days for one platform.' },
  { step: 4, title: 'Distribute',
    desc: 'Google Play Store: upload APK/AAB, fill Play Console listing, ₹2,500 one-time fee. Apple App Store: upload IPA via Xcode, ₹8,000/year Apple Developer Program. Internal distribution (enterprise): host APK on own server, field team installs directly. Capacitor apps update automatically when the web app updates — no re-submission needed for most changes.' },
];

const SAAS_TIERS = [
  {
    name: 'Included',
    price: 'No extra charge',
    scope: 'Operix ERP Professional+ · SalesX Hub licensed',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    conditions: [
      'Field App and Supervisor App both included',
      'Ops manager controls feature access via Comply360 SAM Config toggles',
      'Supervisor role auto-scoped from Hierarchy Master level',
      'White-label not included at this tier',
      'No per-salesman licence fee when SalesX Hub is part of the ERP plan',
    ],
  },
  {
    name: 'Add-on',
    price: 'Salesman ₹49–149 / head / month  ·  Supervisor ₹199–299 / head / month',
    scope: 'Operix ERP Starter tier or SalesX-only subscribers',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    conditions: [
      'Add Field App independently without full SalesX Hub',
      'Field App: Today\'s Beat, check-in, visit log, secondary sales',
      'Supervisor App requires Field App licensing for team members',
      'Commission + Target views require SalesX Hub tier',
      'Billed per active salesman / supervisor per month',
    ],
  },
  {
    name: 'Enterprise White-Label',
    price: 'Custom — contact sales',
    scope: 'Enterprise tier only',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    conditions: [
      'Your logo and brand throughout both apps',
      'Custom domain — yourcompany.salesxgo.app',
      'SSO — Google Workspace, Microsoft 365',
      'Capacitor-wrapped APK for internal Play Store distribution',
      'Custom feature toggles and field sets',
      'Dedicated onboarding and support',
    ],
  },
];

export function SalesXGoMobilePanel() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-10">

        {/* Back nav */}
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Operix Go
        </Button>

        {/* Header */}
        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-orange-500/10 flex items-center justify-center shrink-0">
            <Smartphone className="h-6 w-6 text-orange-500" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">SalesX Go Sahayak</h1>
              <span className="text-xl text-muted-foreground font-normal">— सहायक</span>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Phase 2</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Two apps — one for the field salesman, one for the area manager.
              PWA: no install required. Capacitor wrapper available for Play Store / App Store.
            </p>
          </div>
        </div>

        {/* What it does */}
        <div className="rounded-lg border-2 border-dashed p-6">
          <h2 className="text-lg font-semibold mb-2">What SalesX Go does</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A salesman opens the app outside a customer shop, not at a desk. One thumb on a phone,
            not two hands on a laptop. SalesX Go puts the entire field-force workflow on the phone:
            Today's Beat with route-sequenced stops, geo check-in enforced within a 500m radius
            of the customer's registered location, photo attachments for displays and damaged stock,
            visit outcome capture (order, follow-up, sample given), live target progress, and live
            commission earned. The Supervisor app gives the area manager a real-time team coverage
            dashboard, beat productivity %, visit log review, and one-tap approval for any
            correction request from the field. Both are Progressive Web Apps — installed from a
            browser link in 10 seconds. Capacitor wrapper ships native APK / IPA when an
            enterprise client needs a Play Store listing.
          </p>
        </div>

        {/* ══ FIELD APP ════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-orange-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Field App — सहायक क्षेत्र</h2>
              <p className="text-xs text-muted-foreground">For salesmen, agents, brokers — beat, check-in, visit log, secondary sales</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {FIELD_FORCE_FEATURES.map(f => (
              <Card key={f.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <f.icon className="h-5 w-5 text-orange-500" />{f.title}
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* ══ SUPERVISOR APP ════════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Users className="h-4 w-4 text-violet-600" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Supervisor App — सहायक प्रबंधक</h2>
              <p className="text-xs text-muted-foreground">For area / territory managers — team coverage, beat productivity, approvals</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-4">
            {SUPERVISOR_FEATURES.map(f => (
              <Card key={f.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <f.icon className="h-5 w-5 text-violet-600" />{f.title}
                  </CardTitle>
                </CardHeader>
                <CardContent><p className="text-xs text-muted-foreground leading-relaxed">{f.desc}</p></CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Comparison table */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Three views of the same data</h2>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-40">Feature</TableHead>
                <TableHead>Web ERP</TableHead>
                <TableHead>Field App</TableHead>
                <TableHead>Supervisor App</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {COMPARE.map(r => (
                  <TableRow key={r.feature}>
                    <TableCell className="font-medium text-sm">{r.feature}</TableCell>
                    <TableCell className="text-sm">{r.web}</TableCell>
                    <TableCell className="text-sm">{r.field}</TableCell>
                    <TableCell className="text-sm">{r.mgr}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* SaaS Tiers */}
        <div>
          <h2 className="text-lg font-semibold mb-1">Pricing</h2>
          <p className="text-sm text-muted-foreground mb-4">Applies to both Field and Supervisor apps together.</p>
          <div className="grid sm:grid-cols-3 gap-4">
            {SAAS_TIERS.map(tier => (
              <div key={tier.name} className="rounded-xl border bg-card/60 p-5 space-y-3">
                <Badge className={tier.color}>{tier.name}</Badge>
                <div>
                  <p className="text-sm font-bold leading-snug">{tier.price}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{tier.scope}</p>
                </div>
                <ul className="space-y-1.5">
                  {tier.conditions.map(c => (
                    <li key={c} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <CheckCircle2 className="h-3 w-3 text-green-500 mt-0.5 shrink-0" />{c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* ══ BUILD GUIDE — PHASE 1: PWA ══════════════════ */}
        <div>
          <div className="flex items-center gap-3 mb-4">
            <Badge className="bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300 text-sm px-3 py-1">Phase 1</Badge>
            <h2 className="text-lg font-semibold">Build Guide — Progressive Web App</h2>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Built by Lovable — same React codebase, no separate mobile developer.
            Runs in any phone browser. Installable on Android and iOS.
          </p>
          <div className="space-y-3">
            {PWA_STEPS.map(s => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-orange-500/10 flex items-center justify-center shrink-0 text-sm font-bold text-orange-500">{s.step}</div>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ BUILD GUIDE — PHASE 2: CAPACITOR ═══════════ */}
        <div className="rounded-xl border border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/20 p-6 space-y-4">
          <div className="flex items-center gap-3">
            <Badge className="bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300 text-sm px-3 py-1">Phase 2</Badge>
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
              <h2 className="text-lg font-semibold">App Store Distribution via Capacitor</h2>
            </div>
          </div>
          <div className="rounded-lg bg-indigo-100/60 dark:bg-indigo-900/20 p-4">
            <p className="text-sm font-medium text-indigo-800 dark:text-indigo-300 mb-1">What is Capacitor?</p>
            <p className="text-xs text-indigo-700 dark:text-indigo-400 leading-relaxed">
              Capacitor (by Ionic) wraps the existing React PWA in a thin native shell.
              Zero changes to the React code. The same SalesX Go codebase that runs in the browser
              becomes a native Android APK or iOS IPA. Capacitor plugins replace Web APIs with
              native equivalents: Web Push becomes FCM / APNs, Web Geolocation becomes background
              GPS, file uploads become native camera. When the web app updates, the Capacitor app
              updates automatically — no re-submission.
            </p>
          </div>
          <div className="space-y-3">
            {CAPACITOR_STEPS.map(s => (
              <div key={s.step} className="flex gap-4 items-start">
                <div className="h-8 w-8 rounded-full bg-indigo-500/10 flex items-center justify-center shrink-0 text-sm font-bold text-indigo-600 dark:text-indigo-400">{s.step}</div>
                <div>
                  <p className="text-sm font-medium text-foreground">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="grid sm:grid-cols-3 gap-3 pt-2">
            {[
              { label: 'Developer time', value: '2–3 days per platform' },
              { label: 'Android (Play Store)', value: '₹2,500 one-time fee' },
              { label: 'iOS (App Store)', value: '₹8,000 / year' },
            ].map(s => (
              <div key={s.label} className="rounded-lg bg-indigo-100/60 dark:bg-indigo-900/20 p-3 text-center">
                <p className="text-xs text-indigo-600 dark:text-indigo-400">{s.label}</p>
                <p className="text-sm font-semibold text-foreground mt-0.5">{s.value}</p>
              </div>
            ))}
          </div>
          <div className="flex items-start gap-3 pt-1">
            <Layers className="h-4 w-4 text-indigo-500 mt-0.5 shrink-0" />
            <p className="text-xs text-muted-foreground">
              Capacitor is triggered only when enterprise clients require Play Store or App Store
              listing. The PWA covers 95%+ of use cases without any app store involvement.
            </p>
          </div>
        </div>

        {/* Phase rationale */}
        <div className="flex items-start gap-3 rounded-lg border border-green-200 bg-green-50 dark:border-green-800 dark:bg-green-950/30 p-4">
          <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-green-800 dark:text-green-300">Why Phase 2?</p>
            <p className="text-xs text-green-600 dark:text-green-400 mt-1">
              The Sprint 7 field-force engine, territory master, beat routes, visit log, and
              secondary sales modules are production-stable on the web. The mobile UI shell is
              built by Lovable using [JWT] stubs — same pattern as the ERP. The app goes live
              to real salesmen once the backend API replaces localStorage.
              Phase 1 web modules are complete. Phase 2 PWA shell is built in this sprint.
              Phase 2 backend wiring happens when the API server is ready.
              Phase 2 Capacitor wrapping happens on first enterprise client request.
            </p>
          </div>
        </div>

      </div>
    </div>
  );
}

export default function SalesXGoMobile() { return <SalesXGoMobilePanel />; }
