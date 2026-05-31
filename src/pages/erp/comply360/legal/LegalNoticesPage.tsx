/**
 * @file        src/pages/erp/comply360/legal/LegalNoticesPage.tsx
 * @sprint      Sprint 82 · T-Phase-5.B.2.3 · FR-106 14th scenario · 2 → 7 tabs
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import ITR6Page from './ITR6Page';
import StampDutyPage from './StampDutyPage';
import {
  recordLegalNotice, listLegalNotices, fileGSTAppeal, listGSTAppeals,
  recordLitigationCase, listLitigationCases, listNoticeTemplates,
  seedStandardNoticeTemplates, getUpcomingDeadlines,
} from '@/lib/comply360-legal-notices-engine';
import { getActiveBAPAccount, type BAPAccountId } from '@/lib/comply360-audit-framework-engine';

type SubTab = 'itr6' | 'stamp' | 'notices' | 'gst-appeals' | 'litigation' | 'voluntary-payments' | 'templates';
const ENTITY = 'OPERIX-DEMO';

export default function LegalNoticesPage(): JSX.Element {
  const [tab, setTab] = useState<SubTab>('notices');
  const [bap] = useState<BAPAccountId>(getActiveBAPAccount());
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="itr6">ITR-6</TabsTrigger>
          <TabsTrigger value="stamp">Stamp Duty</TabsTrigger>
          <TabsTrigger value="notices">Active Notices</TabsTrigger>
          <TabsTrigger value="gst-appeals">GST Appeals</TabsTrigger>
          <TabsTrigger value="litigation">Litigation</TabsTrigger>
          <TabsTrigger value="voluntary-payments">Voluntary Payments</TabsTrigger>
          <TabsTrigger value="templates">Notice Templates</TabsTrigger>
        </TabsList>
        <TabsContent value="itr6"><ITR6Page /></TabsContent>
        <TabsContent value="stamp"><StampDutyPage /></TabsContent>
        <TabsContent value="notices"><ActiveNoticesPanel bap={bap} /></TabsContent>
        <TabsContent value="gst-appeals"><GSTAppealsPanel bap={bap} /></TabsContent>
        <TabsContent value="litigation"><LitigationPanel bap={bap} /></TabsContent>
        <TabsContent value="voluntary-payments"><VoluntaryPaymentsPanel /></TabsContent>
        <TabsContent value="templates"><NoticeTemplatesPanel bap={bap} /></TabsContent>
      </Tabs>
    </div>
  );
}

function ActiveNoticesPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [items, setItems] = useState(listLegalNotices(ENTITY));
  const upcoming = getUpcomingDeadlines(ENTITY, 30);
  return (
    <div className="space-y-3 p-2">
      <h3 className="text-lg font-semibold">Active Legal Notices</h3>
      <Button onClick={() => {
        recordLegalNotice({
          entity_code: ENTITY, notice_type: 'IT_Section_143',
          notice_number: `IT/${Date.now()}`, issuing_authority: 'AO Ward 4(2)',
          notice_date: new Date().toISOString().slice(0, 10),
          response_deadline: new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10),
          amount_demanded_inr: null, subject: 'Scrutiny assessment FY 2024-25',
          recorded_by_bap: bap,
        });
        setItems(listLegalNotices(ENTITY));
      }}>Record Demo Notice</Button>
      <p className="text-sm text-muted-foreground">Open notices: <span className="font-mono">{items.length}</span> · Upcoming ≤30d: <span className="font-mono">{upcoming.length}</span></p>
    </div>
  );
}

function GSTAppealsPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [items, setItems] = useState(listGSTAppeals(ENTITY));
  return (
    <div className="space-y-3 p-2">
      <h3 className="text-lg font-semibold">GST Appeals (APL-01 / APL-04)</h3>
      <Button onClick={() => {
        fileGSTAppeal({
          notice_id: null, stage: 'APL_01_first_appeal',
          filed_date: new Date().toISOString().slice(0, 10),
          filing_authority: 'Joint Commissioner (Appeals)',
          grounds_of_appeal: 'Disputed ITC reversal',
          amount_disputed_inr: 250000, recorded_by_bap: bap,
        });
        setItems(listGSTAppeals(ENTITY));
      }}>File Demo APL-01</Button>
      <p className="text-sm text-muted-foreground">Appeals on file: <span className="font-mono">{items.length}</span></p>
    </div>
  );
}

function LitigationPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [items, setItems] = useState(listLitigationCases(ENTITY));
  return (
    <div className="space-y-3 p-2">
      <h3 className="text-lg font-semibold">Litigation Register</h3>
      <Button onClick={() => {
        recordLitigationCase({
          case_number: `WP/${Date.now()}`, case_title: 'Operix Demo vs State of MH',
          court_name: 'Bombay High Court', case_type: 'tax_appeal',
          filed_date: new Date().toISOString().slice(0, 10),
          counsel_name: 'Adv. Demo', amount_at_stake_inr: 1000000,
          recorded_by_bap: bap,
        });
        setItems(listLitigationCases(ENTITY));
      }}>Record Demo Case</Button>
      <p className="text-sm text-muted-foreground">Cases on file: <span className="font-mono">{items.length}</span></p>
    </div>
  );
}

function VoluntaryPaymentsPanel(): JSX.Element {
  return (
    <div className="space-y-3 p-2">
      <h3 className="text-lg font-semibold">DRC-03 Voluntary Payments</h3>
      <p className="text-sm text-muted-foreground">Use the Notice Templates tab to draft a DRC-03 voluntary payment letter.</p>
    </div>
  );
}

function NoticeTemplatesPanel({ bap }: { bap: BAPAccountId }): JSX.Element {
  const [items, setItems] = useState(listNoticeTemplates());
  return (
    <div className="space-y-3 p-2">
      <h3 className="text-lg font-semibold">Notice Response Templates</h3>
      <Button onClick={() => { seedStandardNoticeTemplates(bap); setItems(listNoticeTemplates()); }}>
        Seed 5 Standard Templates
      </Button>
      <p className="text-sm text-muted-foreground">Templates on file: <span className="font-mono">{items.length}</span></p>
    </div>
  );
}
