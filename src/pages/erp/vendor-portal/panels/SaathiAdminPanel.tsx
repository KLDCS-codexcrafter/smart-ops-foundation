/**
 * @file        src/pages/erp/vendor-portal/panels/SaathiAdminPanel.tsx
 * @purpose     Saathi (साथी · companion) Vendor AI Co-Pilot · admin command surface · 4 tabs
 *              Status · Routing Rules · Activity Log · Configuration · ALL Phase 2 functionality placeholder
 * @who         Admin · Procurement HOD · MD · Saathi operator
 * @when        2026-05-18 (Sprint A.2)
 * @sprint      T-Phase-1.A.2-VendorPortal-Architecture-Seeds
 * @iso         ISO 25010 Functional Suitability · Usability
 * @whom        Audit Owner
 * @decisions   D-NEW-DQ (Saathi brand identity · admin command surface) · A-Q16=A · D-NEW-DN canonical
 * @disciplines FR-30
 * @reuses      @/components/ui/tabs · @/components/ui/card · @/components/ui/badge · lucide-react icons
 * @[JWT]       N/A (placeholder surface · no real API calls until Phase 2)
 *
 * Sprint A.2 plants the SURFACE only · 4 tabs render with educational placeholder content
 * describing what each will do in Phase 2. NO real WhatsApp connection · NO real routing engine ·
 * NO real AI calls. Admin can navigate · understand future capabilities · provide feedback.
 *
 * Phase 2 (P2BB-adjacent · 6-12 months) will wire:
 * - WhatsApp Business API integration
 * - Real routing rules engine (which vendor categories get Saathi · per-buyer language preference)
 * - Real activity log from Saathi runtime
 * - Real configuration store (auto-reply · max negotiation rounds · price-floor protection)
 */

import {
  Card, CardContent, CardDescription, CardHeader, CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Bot, Activity, Settings, MessageSquare, AlertCircle,
  CheckCircle, Globe, Phone, ListChecks,
} from 'lucide-react';

export function SaathiAdminPanel(): JSX.Element {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="h-10 w-10 rounded-lg bg-slate-500/15 flex items-center justify-center">
          <Bot className="h-6 w-6 text-slate-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            Saathi · Vendor AI Co-Pilot
            <Badge variant="outline" className="text-[10px]">Admin Command Surface</Badge>
          </h1>
          <p className="text-sm text-muted-foreground">
            साथी (companion) · WhatsApp-native AI for vendors · drafts quotes · negotiates within rules · tracks payments · multi-lingual (Hindi · Tamil · Bengali · Gujarati)
          </p>
        </div>
      </div>

      {/* Phase 2 callout */}
      <Card className="border-amber-500/30 bg-amber-500/5">
        <CardContent className="p-4 flex items-start gap-3">
          <AlertCircle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-sm font-medium">Phase 2 Functionality</p>
            <p className="text-xs text-muted-foreground">
              This admin surface is the Sprint A.2 architectural seed for Saathi. WhatsApp Business API
              integration · real routing engine · live activity log · production configuration · all
              land in Phase 2 (P2BB-adjacent · 6-12 months). Today this surface previews the future capabilities.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* 4 Tabs */}
      <Tabs defaultValue="status">
        <TabsList>
          <TabsTrigger value="status">Status</TabsTrigger>
          <TabsTrigger value="routing">Routing Rules</TabsTrigger>
          <TabsTrigger value="activity">Activity Log</TabsTrigger>
          <TabsTrigger value="configuration">Configuration</TabsTrigger>
        </TabsList>

        {/* Tab 1 · Status */}
        <TabsContent value="status" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Activity className="h-4 w-4" />
                Saathi Readiness
              </CardTitle>
              <CardDescription>System health · WhatsApp connection · vendor enrollment</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">WhatsApp Business API connection</span>
                <Badge variant="outline" className="gap-1"><AlertCircle className="h-3 w-3" />Not connected · Phase 2</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Vendors enrolled in Saathi pilot</span>
                <Badge variant="secondary">0 · Phase 2</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">MSME-43BH auto-compliance vendors</span>
                <Badge variant="secondary">0 · Phase 2</Badge>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Active conversations (last 24h)</span>
                <Badge variant="secondary">0 · Phase 2</Badge>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2 · Routing Rules */}
        <TabsContent value="routing" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <ListChecks className="h-4 w-4" />
                Routing Rules
              </CardTitle>
              <CardDescription>Which vendor categories get Saathi · per-buyer language preference · escalation thresholds</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-dashed border-border/50 p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Globe className="h-4 w-4" />Phase 2 will configure:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Vendor category enrollment (MSME-only · all-vendors · custom whitelist)</li>
                  <li>Per-buyer default language (en-IN · hi-IN · ta-IN · bn-IN · gu-IN)</li>
                  <li>Auto-negotiation enabled categories vs human-only categories</li>
                  <li>Escalation threshold (e.g. RFQ value &gt; ₹X routes to human)</li>
                  <li>Saathi business hours (24x7 vs 9-6 IST)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 3 · Activity Log */}
        <TabsContent value="activity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <MessageSquare className="h-4 w-4" />
                Activity Log
              </CardTitle>
              <CardDescription>Read-only · last 50 Saathi interactions · queries answered · escalations · errors</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8 text-sm text-muted-foreground space-y-2">
                <CheckCircle className="h-8 w-8 mx-auto text-slate-400" />
                <p>No Saathi activity yet · Phase 2 will stream real-time interactions here</p>
                <p className="text-xs">
                  Sample event types: <span className="font-mono">rfq_received · quote_drafted · quote_submitted · negotiation_round · escalated · payment_alert · error</span>
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 4 · Configuration */}
        <TabsContent value="configuration" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Configuration
              </CardTitle>
              <CardDescription>Auto-reply rules · max negotiation rounds · price-floor protection · holiday mode</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="rounded-md border border-dashed border-border/50 p-4 text-sm text-muted-foreground space-y-2">
                <p className="font-medium text-foreground flex items-center gap-2">
                  <Phone className="h-4 w-4" />Phase 2 will configure:
                </p>
                <ul className="list-disc list-inside space-y-1 text-xs">
                  <li>Auto-reply enabled / disabled toggle</li>
                  <li>Max auto-negotiation rounds (default: 3)</li>
                  <li>Price-floor protection (Saathi never accepts below ₹X% of buyer reference price)</li>
                  <li>Holiday-mode auto-pause (per Indian holidays · per state)</li>
                  <li>Saathi name customization per tenant (default: "Saathi · आपका साथी")</li>
                  <li>Hand-off keywords (when vendor types specific words · Saathi escalates to human)</li>
                </ul>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
