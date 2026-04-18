/**
 * DistributorGoMobile.tsx — Mobile blueprint for the Distributor Portal.
 * Sprint 10. Showcases the same partner features in a phone-frame preview.
 */
import {
  Smartphone, ShoppingCart, IndianRupee, Package, FileText, Bell,
  Truck, ArrowRight, Sparkles, Wifi, WifiOff,
} from 'lucide-react';
import { AppLayout } from '@/components/layout/AppLayout';

const INDIGO = 'hsl(231 48% 58%)';
const INDIGO_BG = 'hsl(231 48% 48% / 0.18)';

const features = [
  { Icon: Package, title: 'Tier-Priced Catalog', detail: 'Gold/Silver/Bronze prices applied automatically. Search, filter, smart reorder hints.' },
  { Icon: ShoppingCart, title: 'Offline Cart', detail: 'IndexedDB-backed. Survives flaky 4G; sync on reconnect.' },
  { Icon: FileText, title: 'Invoice + EWB Tracking', detail: 'PDFs with signed IRN QR. Live e-way bill validity countdown.' },
  { Icon: IndianRupee, title: 'Pay & Intimate', detail: 'UPI deep-link, RTGS UTR capture. Accountant verifies & posts a Receipt.' },
  { Icon: Bell, title: 'Push Updates', detail: 'Order approved, payment converted, broadcast — all via push notifications.' },
];

export function DistributorGoMobilePanel() { return <DistributorGoMobile />; }

export default function DistributorGoMobile() {
  return (
    <AppLayout
      title="Distributor Go (Mobile)"
      breadcrumbs={[{ label: 'Operix Go', href: '/operix-go' }, { label: 'Distributor Go' }]}
    >
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 animate-fade-in">
        {/* Phone preview */}
        <div className="flex justify-center">
          <div className="relative w-[300px] h-[600px] rounded-[2.5rem] border-8 p-2 shadow-2xl"
            style={{ borderColor: 'hsl(222 47% 11%)', background: 'hsl(222 47% 11%)' }}>
            <div className="w-full h-full rounded-[2rem] overflow-hidden flex flex-col"
              style={{ background: 'hsl(222 47% 8%)' }}>
              {/* Status bar */}
              <div className="flex items-center justify-between px-5 py-2.5 text-[10px] text-white/70">
                <span className="font-mono">9:41</span>
                <div className="flex items-center gap-1">
                  <Wifi className="h-3 w-3" />
                  <div className="w-5 h-2.5 rounded-sm border border-white/40 relative">
                    <div className="absolute inset-0.5 right-0.5 bg-white/70 rounded-[1px]" />
                  </div>
                </div>
              </div>

              {/* Header */}
              <div className="px-4 pb-3">
                <div className="flex items-center gap-2 mb-3">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: INDIGO_BG }}>
                    <Truck className="h-4 w-4" style={{ color: INDIGO }} />
                  </div>
                  <div>
                    <p className="text-[11px] text-white/60">Welcome,</p>
                    <p className="text-sm font-semibold text-white">Mehta Traders</p>
                  </div>
                  <span className="ml-auto text-[8px] font-bold px-1.5 py-0.5 rounded"
                    style={{ background: 'rgba(234,179,8,0.18)', color: 'hsl(38 92% 70%)' }}>GOLD</span>
                </div>

                {/* Credit card */}
                <div className="rounded-2xl p-3 mb-3" style={{ background: 'linear-gradient(135deg, hsl(231 48% 28%), hsl(231 48% 18%))' }}>
                  <p className="text-[10px] text-white/60 uppercase tracking-wider">Available Credit</p>
                  <p className="text-xl font-bold text-white font-mono mt-1">₹ 8,42,500</p>
                  <div className="mt-2 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div className="h-full bg-white/70" style={{ width: '32%' }} />
                  </div>
                  <p className="text-[9px] text-white/50 mt-1">32% utilised • limit ₹ 12,50,000</p>
                </div>

                {/* Quick actions */}
                <div className="grid grid-cols-4 gap-2 mb-3">
                  {[
                    { Icon: Package, label: 'Catalog' },
                    { Icon: ShoppingCart, label: 'Cart' },
                    { Icon: FileText, label: 'Bills' },
                    { Icon: IndianRupee, label: 'Pay' },
                  ].map(a => (
                    <div key={a.label} className="flex flex-col items-center gap-1 rounded-xl py-2"
                      style={{ background: 'hsl(0 0% 100% / 0.04)' }}>
                      <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: INDIGO_BG }}>
                        <a.Icon className="h-3.5 w-3.5" style={{ color: INDIGO }} />
                      </div>
                      <p className="text-[9px] text-white/70">{a.label}</p>
                    </div>
                  ))}
                </div>

                {/* Suggested */}
                <div className="rounded-2xl p-3 mb-3" style={{ background: 'hsl(0 0% 100% / 0.04)' }}>
                  <div className="flex items-center gap-1.5 mb-2">
                    <Sparkles className="h-3 w-3" style={{ color: INDIGO }} />
                    <p className="text-[10px] font-semibold text-white">Smart reorder</p>
                  </div>
                  <p className="text-xs text-white">Tata Salt 1kg × 24</p>
                  <p className="text-[10px] text-white/50">Bought 18 last month — ₹ 432</p>
                </div>

                {/* Activity */}
                <div className="space-y-1.5">
                  <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: 'hsl(0 0% 100% / 0.04)' }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center"
                      style={{ background: 'hsl(142 71% 45% / 0.18)' }}>
                      <IndianRupee className="h-3 w-3" style={{ color: 'hsl(142 71% 60%)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white truncate">Payment ₹ 1,24,000 converted</p>
                      <p className="text-[8px] text-white/50">2h ago</p>
                    </div>
                  </div>
                  <div className="rounded-xl p-2.5 flex items-center gap-2" style={{ background: 'hsl(0 0% 100% / 0.04)' }}>
                    <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: INDIGO_BG }}>
                      <FileText className="h-3 w-3" style={{ color: INDIGO }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-white truncate">Invoice SI/2026/0184 posted</p>
                      <p className="text-[8px] text-white/50">Yesterday</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Bottom nav */}
              <div className="mt-auto border-t border-white/10 px-4 py-2.5 flex items-center justify-around">
                {[Package, ShoppingCart, FileText, IndianRupee, Bell].map((Icon, i) => (
                  <Icon key={i} className="h-4 w-4" style={{ color: i === 0 ? INDIGO : 'hsl(0 0% 100% / 0.4)' }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Spec sheet */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-border/50 bg-card p-5">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'hsl(231 48% 48% / 0.12)' }}>
                <Smartphone className="h-4 w-4" style={{ color: INDIGO }} />
              </div>
              <h3 className="text-sm font-semibold text-foreground">Distributor Go — Mobile Blueprint</h3>
            </div>
            <p className="text-xs text-muted-foreground">
              Same offline-first architecture as the web portal: IndexedDB cart, JWT-scoped session,
              tier-priced catalog. Built as a PWA — installable from the browser, no Play Store gate.
            </p>
          </div>

          <div className="space-y-2">
            {features.map(f => (
              <div key={f.title} className="rounded-xl border border-border/50 bg-card p-4 flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'hsl(231 48% 48% / 0.12)' }}>
                  <f.Icon className="h-4 w-4" style={{ color: INDIGO }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground">{f.title}</p>
                  <p className="text-xs text-muted-foreground mt-0.5">{f.detail}</p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground shrink-0 mt-2" />
              </div>
            ))}
          </div>

          <div className="rounded-2xl border border-border/50 bg-card p-4 text-xs text-muted-foreground flex items-center gap-2">
            <WifiOff className="h-4 w-4" style={{ color: INDIGO }} />
            Works offline — cart, draft orders, and unsubmitted intimations queue locally and sync on reconnect.
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
