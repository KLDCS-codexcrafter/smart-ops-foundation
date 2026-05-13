/**
 * @file        src/pages/erp/servicedesk/customer-hub/Customer360.tsx
 * @purpose     C.1e · Customer 360 cross-card · 6 tabs · MOAT #24 criterion 9
 * @sprint      T-Phase-1.C.1e · Block E.1
 * @iso         Functional Suitability + Usability
 */
import { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import {
  listAMCRecords,
  listServiceTickets,
  listHappyCodeFeedback,
  getActiveCustomerTier,
} from '@/lib/servicedesk-engine';
import { AMCProfitabilityPerCustomer } from '../reports/AMCProfitabilityPerCustomer';

const ENTITY = 'OPRX';

function EmptyState({ label }: { label: string }): JSX.Element {
  return <div className="p-8 text-center text-muted-foreground text-sm">{label}</div>;
}

export function Customer360({ customerId }: { customerId?: string | null }): JSX.Element {
  const [activeTab, setActiveTab] = useState<string>('amc');
  const cid = customerId ?? 'C-1';
  const amcs = listAMCRecords({ entity_id: ENTITY, customer_id: cid });
  const tickets = listServiceTickets({ entity_id: ENTITY, customer_id: cid });
  const csat = listHappyCodeFeedback({ entity_id: ENTITY, customer_id: cid });
  const tier = getActiveCustomerTier(cid, ENTITY);

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <Card className="glass-card p-4 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Customer 360</h1>
          <p className="text-sm text-muted-foreground mt-1 font-mono">{cid}</p>
        </div>
        <div className="flex gap-2">
          {tier && <Badge variant="default">Tier · {tier.tier}</Badge>}
          <Badge variant="secondary">Risk · medium</Badge>
        </div>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="amc">AMC ({amcs.length})</TabsTrigger>
          <TabsTrigger value="service">Service ({tickets.length})</TabsTrigger>
          <TabsTrigger value="csat">CSAT ({csat.length})</TabsTrigger>
          <TabsTrigger value="payment">Payment</TabsTrigger>
          <TabsTrigger value="contact">Contact</TabsTrigger>
          <TabsTrigger value="profit">Profit</TabsTrigger>
        </TabsList>

        <TabsContent value="amc">
          <Card className="glass-card overflow-x-auto">
            {amcs.length === 0 ? <EmptyState label="No AMCs for this customer" /> : (
              <table className="w-full text-sm">
                <thead className="border-b border-border"><tr className="text-left">
                  <th className="p-3">AMC</th><th className="p-3">Type</th><th className="p-3">Status</th><th className="p-3">Expires</th>
                </tr></thead>
                <tbody>{amcs.map((a) => (
                  <tr key={a.id} className="border-b border-border/50">
                    <td className="p-3 font-mono text-xs">{a.amc_code}</td>
                    <td className="p-3 text-xs">{a.amc_type}</td>
                    <td className="p-3"><Badge variant="secondary">{a.status}</Badge></td>
                    <td className="p-3 text-xs">{a.contract_end}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="service">
          <Card className="glass-card overflow-x-auto">
            {tickets.length === 0 ? <EmptyState label="No service tickets" /> : (
              <table className="w-full text-sm">
                <thead className="border-b border-border"><tr className="text-left">
                  <th className="p-3">Ticket</th><th className="p-3">Status</th><th className="p-3">Severity</th><th className="p-3">Raised</th>
                </tr></thead>
                <tbody>{tickets.map((t) => (
                  <tr key={t.id} className="border-b border-border/50">
                    <td className="p-3 font-mono text-xs">{t.ticket_no}</td>
                    <td className="p-3"><Badge variant="secondary">{t.status}</Badge></td>
                    <td className="p-3 text-xs">{t.severity}</td>
                    <td className="p-3 text-xs font-mono">{t.raised_at.slice(0, 10)}</td>
                  </tr>
                ))}</tbody>
              </table>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="csat">
          <Card className="glass-card">
            {csat.length === 0 ? <EmptyState label="No CSAT feedback yet" /> : (
              <ul className="divide-y divide-border/50">{csat.map((f) => (
                <li key={f.id} className="p-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm">{f.source} · <span className="text-muted-foreground font-mono text-xs">ticket {f.ticket_id}</span></p>
                    <p className="text-xs text-muted-foreground font-mono">{f.created_at.slice(0, 16)}</p>
                  </div>
                  <Badge variant="secondary">{f.otp_verified ? 'OTP ✓' : 'pending'}</Badge>
                </li>
              ))}</ul>
            )}
          </Card>
        </TabsContent>

        <TabsContent value="payment">
          <Card className="glass-card p-6">
            {/* [JWT] FinCore cross-reference · payment history wires Phase 2 */}
            <EmptyState label="Payment history coming via FinCore bridge · [JWT] Phase 2" />
          </Card>
        </TabsContent>

        <TabsContent value="contact">
          <Card className="glass-card p-6">
            {/* [JWT] reminder + cascade fire log · wires Phase 2 read aggregation */}
            <EmptyState label="Contact log shows recent reminders + cascade fires · [JWT] Phase 2" />
          </Card>
        </TabsContent>

        <TabsContent value="profit">
          <AMCProfitabilityPerCustomer customerId={cid} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
