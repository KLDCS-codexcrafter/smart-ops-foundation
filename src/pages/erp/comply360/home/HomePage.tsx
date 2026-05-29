/**
 * @file        src/pages/erp/comply360/home/HomePage.tsx
 * @purpose     Sprint 78b · Comply360 Home tab-shell (Welcome default + Time-Machine sub-tab · FR-106 recursive · Option B).
 *              Wraps existing Comply360Welcome unchanged on the default tab.
 * @sprint      Sprint 78b · T-Phase-5.A.1.10-PASS-B · Block 5
 * @decisions   DP-S78-2 (Option B · home tab-shell) · FR-106
 */
import { useState } from 'react';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Comply360Welcome } from '../Comply360Welcome';
import TimeMachinePage from './TimeMachinePage';
import type { Comply360Module } from '../Comply360Sidebar.types';

interface Props {
  onNavigate: (m: Comply360Module) => void;
}

type SubTab = 'welcome' | 'time-machine';

export default function HomePage({ onNavigate }: Props): JSX.Element {
  const [tab, setTab] = useState<SubTab>('welcome');
  return (
    <div className="p-4">
      <Tabs value={tab} onValueChange={(v) => setTab(v as SubTab)}>
        <TabsList>
          <TabsTrigger value="welcome">Welcome</TabsTrigger>
          <TabsTrigger value="time-machine">Time-Machine</TabsTrigger>
        </TabsList>
        <TabsContent value="welcome">
          <Comply360Welcome onNavigate={onNavigate} />
        </TabsContent>
        <TabsContent value="time-machine">
          <TimeMachinePage />
        </TabsContent>
      </Tabs>
    </div>
  );
}
