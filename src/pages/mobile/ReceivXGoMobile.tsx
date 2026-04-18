/**
 * ReceivXGoMobile.tsx — Mobile blueprint for ReceivX Collections
 * Sprint 8 · Mirrors SalesXGoMobile structure · Amber-500 accent
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
  Smartphone, ArrowLeft, CheckCircle2, IndianRupee, MapPin, Camera,
  CreditCard, Receipt, BellRing, Users, BarChart3, MailWarning,
  ClipboardList, Package, Layers, WifiOff, CalendarClock, Navigation,
} from 'lucide-react';

const COLLECTION_EXEC_FEATURES = [
  { icon: Navigation, title: "Today's Route",
    desc: "Optimised collection route — overdue customers prioritised by amount and aging. One-tap to call, navigate, or check in. Total to be collected today shown at the top." },
  { icon: Receipt, title: 'Receipt Capture with UTR',
    desc: 'Punch a receipt the moment cash or UPI lands — amount, mode, UTR / cheque no, party. Auto-allocates against the oldest invoice. Receipt voucher posted live to FineCore.' },
  { icon: Camera, title: 'Photo Capture',
    desc: 'Photo of the cheque, cash counted, UPI confirmation screen — all attached to the receipt. Tamper-evident audit trail.' },
  { icon: CreditCard, title: 'Payment Link + UPI QR',
    desc: 'Generate a Razorpay / PayU / Cashfree pay link or UPI intent QR on the spot. Share via WhatsApp in two taps. Customer pays from their phone — receipt auto-flows when webhook hits.' },
  { icon: CalendarClock, title: 'PTP Logging',
    desc: 'Promise-to-pay captured at the door — promised date, amount, channel. Auto-creates a follow-up task. Manager sees PTP funnel + broken-promise rate.' },
  { icon: BellRing, title: 'Push Notifications',
    desc: 'Customer requests collection visit, supervisor escalates dunning, payment received via web link, PTP comes due — all push notifications.' },
  { icon: WifiOff, title: 'Offline Queue',
    desc: 'Godown back-rooms with no signal? Receipts and PTPs are stored on-device and flushed to the server on reconnect with original timestamps. Field reality, not theory.' },
  { icon: IndianRupee, title: 'My Incentive Live',
    desc: 'Live earnings — base collection commission + recovery bonus (collections within window) + scheme discounts shared with customer. TDS deducted, net visible.' },
];

const SUPERVISOR_FEATURES = [
  { icon: Users, title: 'Team Collection Today',
    desc: 'Live dashboard — total collected today by team, per exec breakdown, top performers, lagging execs. Tap any exec to see route status, receipts captured, PTPs logged.' },
  { icon: MapPin, title: 'Route Adherence Map',
    desc: 'Map view of all collection execs — current location, planned route, deviations. Heat map of overdue clusters. Re-route on the fly.' },
  { icon: CheckCircle2, title: 'Receipt Approval',
    desc: 'High-value receipts (configurable threshold) require supervisor approval before posting. One-tap approve or reject with reason.' },
  { icon: MailWarning, title: 'Dunning Escalation Approval',
    desc: 'Field exec requests an escalation to firm or final notice — supervisor approves from phone. Audit trail with reason.' },
  { icon: BarChart3, title: 'Team Efficiency',
    desc: 'Receipts / day, conversion of overdue to received, average days-to-receive. Compare execs side-by-side. Filter by territory.' },
  { icon: BellRing, title: 'Escalation Alerts',
    desc: 'Push alerts on: customer with 60+ day overdue and no contact, broken PTP, exec missed planned visit, high-value receipt pending approval.' },
];

const COMPARE = [
  { feature: 'Primary user',           web: 'Accounts / Receivables Mgr',         field: 'Collection Exec',                           mgr: 'Collection Supervisor' },
  { feature: 'Outstanding view',       web: 'Full register with aging',           field: "Today's route only",                        mgr: 'Team-wide view' },
  { feature: 'Receipt capture',        web: 'Full voucher entry',                 field: 'One-tap mobile capture + photo + UTR',      mgr: 'Approve high-value' },
  { feature: 'Payment link',           web: 'Generate + email + WhatsApp',        field: 'Generate + WhatsApp share',                 mgr: 'View links sent' },
  { feature: 'UPI QR',                 web: 'Print on invoice',                   field: 'Show on phone screen at customer',          mgr: 'Not applicable' },
  { feature: 'PTP capture',            web: 'PTP Tracker module',                 field: 'On-the-spot at customer',                   mgr: 'Funnel + broken rate' },
  { feature: 'Photo capture',          web: 'View only',                          field: 'Cheque / cash / UPI screen',                mgr: 'View only' },
  { feature: 'Dunning send',           web: 'Bulk send from console',             field: 'Suggest escalation',                        mgr: 'Approve escalation' },
  { feature: 'Credit hold override',   web: 'Full audit + reason',                field: 'Read alert only',                           mgr: 'Approve override request' },
  { feature: 'Incentive view',         web: 'Full register + Pay Agent',          field: 'My earning only',                           mgr: 'Team earning summary' },
  { feature: 'Push notifications',     web: 'Not applicable',                     field: 'Visit reminders, PTP due',                  mgr: 'Escalation + approval alerts' },
  { feature: 'Offline mode',           web: 'Not applicable',                     field: 'Receipts + PTPs queued',                    mgr: 'Not applicable' },
  { feature: 'Login type',             web: 'Admin / Accounts session',           field: 'CollectionExec.exec_code + PIN',            mgr: 'Same, supervisor role' },
];

const PWA_STEPS = [
  { step: 1, title: 'Standalone Auth Shell',
    desc: 'Separate /operix-go/receivx/login route with ReceivX scope JWT. Login accepts CollectionExec.exec_code + 4-digit PIN. On success, role detection from erp_receivx_execs — exec lands on Collection App, supervisor on Manager App.' },
  { step: 2, title: 'ReceivX Feature Gate',
    desc: 'Fetch ReceivXConfig on login. Toggle features based on config (e.g., gateway provider drives whether QR tab appears, auto_run_cadence drives whether supervisor approval queue is needed).' },
  { step: 3, title: 'Mobile-Responsive Screens',
    desc: "Reuse OutstandingTaskBoard, PTPTracker, ReminderConsole engines from Sprint 6. Render mobile-first — Today's Route as vertical stop cards. Receipt capture as full-screen modal with camera + UTR field. PTP as quick form. All [JWT]-stubbed for now." },
  { step: 4, title: 'PWA Manifest + Service Worker',
    desc: 'Add public/manifest-receivx-go.json: name ReceivX Go Sahayak, short_name ReceivXGo, theme_color amber, display standalone, icons 192x192 and 512x512. Register service worker for offline receipt queue. Add-to-Home-Screen browser prompt automatic.' },
  { step: 5, title: 'Push Notifications + Offline Queue (godown reality)',
    desc: 'Web Push API with VAPID keys. Subscribe on login. Server triggers push on PTP due, receipt approved, escalation requested. Critical: offline receipt queue stored in IndexedDB — godown back-rooms have zero signal. Receipts captured offline are queued and flushed on reconnect with original timestamps and photos. Requires backend API — stubbed with [JWT] comment.' },
];

const CAPACITOR_STEPS = [
  { step: 1, title: 'Install Capacitor — zero code changes',
    desc: 'npm install @capacitor/core @capacitor/cli @capacitor/android @capacitor/ios. Then: npx cap init. The PWA becomes the Capacitor web layer unchanged. App ID: com.4dsmartops.receivxgo.' },
  { step: 2, title: 'Configure Native Platforms + Plugins',
    desc: 'npx cap add android / ios generates native projects. Add Capacitor plugins: @capacitor/camera (cheque + UPI screen photo), @capacitor/geolocation (route adherence), @capacitor/network (offline detection for queue), @capacitor/push-notifications (FCM / APNs).' },
  { step: 3, title: 'Build + Sign APK / IPA',
    desc: 'npm run build. npx cap sync. Open Android Studio or Xcode, set app ID com.4dsmartops.receivxgo, sign with keystore or Apple cert, build APK or IPA. Total developer time: 2-3 days per platform.' },
  { step: 4, title: 'Distribute',
    desc: 'Google Play Store (₹2,500 one-time), Apple App Store (₹8,000 / year), or internal enterprise APK on own server. Capacitor apps update automatically when the web app updates — no resubmission for most changes.' },
];

const SAAS_TIERS = [
  {
    name: 'Included',
    price: 'No extra charge',
    scope: 'Operix ERP Professional+ · ReceivX Hub licensed',
    color: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
    conditions: [
      'Collection App and Supervisor App both included',
      'Accounts manager controls feature access via ReceivX Config',
      'Supervisor role auto-scoped from CollectionExec.manager_id',
      'White-label not included at this tier',
      'No per-exec licence fee when ReceivX Hub is part of the ERP plan',
    ],
  },
  {
    name: 'Add-on',
    price: 'Exec ₹49–149 / head / month  ·  Supervisor ₹199–299 / head / month',
    scope: 'Operix ERP Starter tier or ReceivX-only subscribers',
    color: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
    conditions: [
      'Add Collection App independently without full ReceivX Hub',
      'Collection App: route, receipt capture, PTP, payment link, QR',
      'Supervisor App requires Collection App licensing for team members',
      'Incentive + Dunning approval require ReceivX Hub tier',
      'Billed per active exec / supervisor per month',
    ],
  },
  {
    name: 'Enterprise White-Label',
    price: 'Custom — contact sales',
    scope: 'Enterprise tier only',
    color: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
    conditions: [
      'Your logo and brand throughout both apps',
      'Custom domain — yourcompany.receivxgo.app',
      'SSO — Google Workspace, Microsoft 365',
      'Capacitor-wrapped APK for internal Play Store distribution',
      'Custom feature toggles, payment provider whitelist, dunning template lock',
      'Dedicated onboarding and support',
    ],
  },
];

export function ReceivXGoMobilePanel() {
  const navigate = useNavigate();
  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-5xl mx-auto p-6 space-y-10">

        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}>
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Operix Go
        </Button>

        <div className="flex items-start gap-4">
          <div className="h-12 w-12 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
            <Smartphone className="h-6 w-6 text-amber-500" />
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl font-bold">ReceivX Go Sahayak</h1>
              <span className="text-xl text-muted-foreground font-normal">— सहायक</span>
              <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300">Phase 2</Badge>
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Two apps — one for the collection exec on the road, one for the receivables manager.
              PWA: no install required. Capacitor wrapper available for Play Store / App Store.
            </p>
          </div>
        </div>

        <div className="rounded-lg border-2 border-dashed p-6">
          <h2 className="text-lg font-semibold mb-2">What ReceivX Go does</h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            A collection exec opens the app outside a customer godown, not at a desk. Today's route
            shows overdue customers prioritised by amount and aging. One-tap to call or navigate.
            On the doorstep — capture a receipt with UTR and a photo of the cheque, generate a UPI
            QR or Razorpay pay link and share on WhatsApp, log a PTP. Receipts and PTPs cached
            offline for godown back-rooms with no signal, flushed on reconnect with original
            timestamps. The Supervisor app gives the manager live team collection, route adherence
            on a map, one-tap approval for high-value receipts and escalation requests, and a real-time
            efficiency dashboard. Both are PWAs — installed from a browser link in 10 seconds.
            Capacitor wrapper ships native APK / IPA for enterprise clients.
          </p>
        </div>

        {/* ══ COLLECTION EXEC APP ══════════════════════════════ */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Smartphone className="h-4 w-4 text-amber-500" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Collection Exec App — सहायक संग्रह</h2>
              <p className="text-xs text-muted-foreground">For collection execs — route, receipt, PTP, payment link, offline queue</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4">
            {COLLECTION_EXEC_FEATURES.map(f => (
              <Card key={f.title}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <f.icon className="h-5 w-5 text-amber-500" />{f.title}
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
              <p className="text-xs text-muted-foreground">For receivables / collection managers — team view, approvals, escalations</p>
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

        {/* Comparison */}
        <div>
          <h2 className="text-lg font-semibold mb-3">Three views of the same data</h2>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader><TableRow>
                <TableHead className="w-40">Feature</TableHead>
                <TableHead>Web ERP</TableHead>
                <TableHead>Collection App</TableHead>
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
          <p className="text-sm text-muted-foreground mb-4">Applies to both Collection Exec and Supervisor apps together.</p>
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

        {/* PHASE 1 — PWA */}
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
                <div className="h-8 w-8 rounded-full bg-amber-500/10 flex items-center justify-center shrink-0 text-sm font-bold text-amber-500">{s.step}</div>
                <div>
                  <p className="text-sm font-medium">{s.title}</p>
                  <p className="text-xs text-muted-foreground">{s.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* PHASE 2 — Capacitor */}
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
              Zero changes to the React code. The same ReceivX Go codebase that runs in the browser
              becomes a native Android APK or iOS IPA. App ID: com.4dsmartops.receivxgo.
              Plugins: camera (cheque photo), geolocation (route), network (offline detection),
              push-notifications (FCM / APNs). When the web app updates, the Capacitor app updates
              automatically — no resubmission needed for most changes.
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
              The Sprint 6 + 7 + 8 ReceivX engines (outstanding tasks, PTP tracker, reminder console,
              payment gateway, credit hold, dunning) are production-stable on the web. The mobile UI
              shell is built by Lovable using [JWT] stubs — same pattern as the ERP. The app goes
              live to real collection execs once the backend API replaces localStorage and gateway
              webhooks land. Phase 2 PWA shell is built in this sprint. Phase 2 Capacitor wrapping
              happens on first enterprise client request.
            </p>
          </div>
        </div>

        {/* Footer icons used to silence unused warnings */}
        <div className="hidden">
          <ClipboardList /><Receipt /><MailWarning />
        </div>

      </div>
    </div>
  );
}

export default function ReceivXGoMobile() { return <ReceivXGoMobilePanel />; }
