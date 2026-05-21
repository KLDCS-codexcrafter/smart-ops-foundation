/**
 * @file        src/pages/erp/eximx/atlas/UnifiedAtlasLayout.tsx
 * @purpose     EX-11 parent · 5 tabs · 4th Unified pattern (after Finance + Compliance + DGFT)
 * @sprint      T-Phase-1.EX-11-Atlas-FULL-BCD-FXWhatIf-BoardPack
 * @decisions   EX-11-Q8=a EximX.types.ts 0-DIFF · composition · 6th application
 * @disciplines FR-30 · FR-50 · FR-58
 */
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Award, Calculator, TrendingUp, FileText, MessageCircle } from 'lucide-react';
import { TDLGapsAtlasFull } from './TDLGapsAtlasFull';
import { BCDCalculator } from './BCDCalculator';
import { FXWhatIf } from './FXWhatIf';
import { BoardPackExport } from './BoardPackExport';
import { AtlasSaathiPanel } from '../saathi/AtlasSaathiPanel';

type AtlasTab = 'atlas-full' | 'bcd-calc' | 'fx-what-if' | 'board-pack' | 'saathi';

export function UnifiedAtlasLayout(): JSX.Element {
  const [tab, setTab] = useState<AtlasTab>('atlas-full');

  const tabs: { id: AtlasTab; label: string; icon: typeof Award }[] = [
    { id: 'atlas-full', label: 'TDL Atlas FULL (Moat #13 PRIMARY)', icon: Award },
    { id: 'bcd-calc', label: 'BCD Calculator', icon: Calculator },
    { id: 'fx-what-if', label: 'FX What-If', icon: TrendingUp },
    { id: 'board-pack', label: 'Board Pack PDF', icon: FileText },
    { id: 'saathi', label: 'Atlas Saathi (13th)', icon: MessageCircle },
  ];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-bold"><Award className="w-5 h-5 inline mr-2" />Unified Atlas Suite · Phase 1 EximX FINALE</h1>
        <p className="text-sm text-muted-foreground">EX-11 institutional capstone · 21 Moats · 12 v7 Gaps · 12 D-NEWs · 11-sprint walk · BCD interactive modeling · FX scenario simulator · Board Pack PDF export · 13th EximX Saathi</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {tabs.map((t) => {
          const Icon = t.icon;
          return <Button key={t.id} variant={tab === t.id ? 'default' : 'outline'} size="sm" onClick={() => setTab(t.id)}><Icon className="w-4 h-4 mr-2" />{t.label}</Button>;
        })}
      </div>

      <div className="border rounded-lg">
        {tab === 'atlas-full' && <TDLGapsAtlasFull />}
        {tab === 'bcd-calc' && <BCDCalculator />}
        {tab === 'fx-what-if' && <FXWhatIf />}
        {tab === 'board-pack' && <BoardPackExport />}
        {tab === 'saathi' && <AtlasSaathiPanel />}
      </div>
    </div>
  );
}
