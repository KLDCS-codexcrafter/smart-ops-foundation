/**
 * @file        src/pages/erp/frontdesk/FrontDeskPage.tsx
 * @purpose     FrontDesk entry shell · canonical Shell consumer · 7 modules.
 * @sprint      Sprint 145 · T-FrontDesk-A6F.1 · Pillar A.6-F · Block 4
 * @decisions   D-250 Shell pattern lock · FR-58 · D-NEW-CC 'f *' keyboard.
 * @reuses      @/shell Shell · frontdesk-shell-config · FrontDeskModule type.
 * @[JWT]       N/A (page shell · routes handled by App.tsx)
 */
import { useState } from 'react';
import { Shell } from '@/shell';
import { frontdeskShellConfig } from '@/apps/erp/configs/frontdesk-shell-config';
import { useCardEntitlement } from '@/hooks/useCardEntitlement';
import { FrontDeskWelcome } from './FrontDeskWelcome';
import { VisitorsPage } from './visitors/VisitorsPage';
import { PlanVisitPage } from './visitors/PlanVisitPage';
import { CheckInPage } from './visitors/CheckInPage';
import { RollCallPage } from './visitors/RollCallPage';
import { ContactBookPage } from './contacts/ContactBookPage';
import { AddressBookReportPage } from './contacts/AddressBookReportPage';
import { WatchlistPage } from './contacts/WatchlistPage';
import { MeetingRoomsPage } from './rooms/MeetingRoomsPage';
import { BookingCalendarPage } from './rooms/BookingCalendarPage';
import { ExecutiveDeskPage } from './exec/ExecutiveDeskPage';
import { MailInwardPage } from './mail/MailInwardPage';
import { MailOutwardPage } from './mail/MailOutwardPage';
import { AssetCustodyPage } from './records/AssetCustodyPage';
import { ReceptionDiaryPage } from './records/ReceptionDiaryPage';
import type { FrontDeskModule } from './FrontDeskSidebar.types';

export default function FrontDeskPage(): JSX.Element {
  const [active, setActive] = useState<FrontDeskModule>('welcome');
  const { entitlements, profile } = useCardEntitlement();

  const render = (): JSX.Element => {
    switch (active) {
      case 'welcome':          return <FrontDeskWelcome onNavigate={setActive} />;
      case 'visitors':         return <VisitorsPage onBookRoom={(visitorId) => { sessionStorage.setItem('fd_prefill_visitor', visitorId); setActive('booking-calendar'); }} />;
      case 'plan-visit':       return <PlanVisitPage onDone={() => setActive('visitors')} />;
      case 'check-in':         return <CheckInPage onDone={() => setActive('visitors')} />;
      case 'roll-call':        return <RollCallPage />;
      case 'contact-book':     return <ContactBookPage />;
      case 'address-book':     return <AddressBookReportPage />;
      case 'watchlist':        return <WatchlistPage />;
      case 'meeting-rooms':    return <MeetingRoomsPage onNavigate={setActive} />;
      case 'booking-calendar': return <BookingCalendarPage />;
      case 'executive-desk':   return <ExecutiveDeskPage />;
      case 'mail-inward':      return <MailInwardPage />;
      case 'mail-outward':     return <MailOutwardPage />;
      case 'asset-custody':    return <AssetCustodyPage />;
      case 'reception-diary':  return <ReceptionDiaryPage />;
      default:                 return <div className="p-6 text-sm text-muted-foreground">Module not found.</div>;
    }
  };

  return (
    <Shell
      config={frontdeskShellConfig}
      userProfile={profile}
      tenantEntitlements={entitlements}
      contextFlags={{ accounting_mode: 'standalone' }}
      onSidebarItemClick={(item) => {
        if (item.moduleId) setActive(item.moduleId as FrontDeskModule);
      }}
    >
      {render()}
    </Shell>
  );
}
