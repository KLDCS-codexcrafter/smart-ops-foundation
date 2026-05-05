/**
 * @file        MobileMaterialIndentPage.tsx
 * @sprint      T-Phase-1.2.6f-d-2-card8-8-pre-1 · Block B · D-404
 */
import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { ArrowLeft, ClipboardList, Plus, Inbox, CheckCircle2 } from 'lucide-react';
import MobileMaterialIndentCapture from '@/components/mobile/MobileMaterialIndentCapture';
import { OfflineIndicator } from '@/components/mobile/OfflineIndicator';
import { materialIndentsKey } from '@/types/material-indent';
import type { MaterialIndent } from '@/types/material-indent';

function getActiveEntityCode(): string {
  try { return localStorage.getItem('active_entity_code') ?? 'DEMO'; } catch { return 'DEMO'; }
}

function readIndents(entityCode: string): MaterialIndent[] {
  try {
    const raw = localStorage.getItem(materialIndentsKey(entityCode));
    return raw ? (JSON.parse(raw) as MaterialIndent[]) : [];
  } catch { return []; }
}

export default function MobileMaterialIndentPage(): JSX.Element {
  const navigate = useNavigate();
  const ENTITY = getActiveEntityCode();
  const [showCapture, setShowCapture] = useState(false);
  const [submittedToday, setSubmittedToday] = useState(0);
  const [drafts, setDrafts] = useState(0);
  const [pendingMine, setPendingMine] = useState(0);

  const refresh = useCallback((): void => {
    const list = readIndents(ENTITY);
    const today = new Date().toISOString().slice(0, 10);
    setSubmittedToday(list.filter(i => i.status === 'submitted' && (i.created_at ?? '').slice(0, 10) === today).length);
    setDrafts(list.filter(i => i.status === 'draft').length);
    setPendingMine(list.filter(i => i.status === 'pending_hod' || i.status === 'pending_purchase' || i.status === 'pending_finance').length);
  }, [ENTITY]);

  useEffect(() => { refresh(); }, [showCapture, refresh]);

  if (showCapture) return <MobileMaterialIndentCapture onClose={() => setShowCapture(false)} />;

  return (
    <div className="min-h-screen bg-background p-4 space-y-4">
      <OfflineIndicator />
      <div className="flex items-center justify-between">
        <Button variant="ghost" size="sm" onClick={() => navigate('/operix-go')}><ArrowLeft className="h-4 w-4 mr-1" />Back</Button>
        <h1 className="text-lg font-bold flex items-center gap-2"><ClipboardList className="h-5 w-5 text-primary" />Material Indent</h1>
        <div className="w-16" />
      </div>

      <div className="grid grid-cols-3 gap-2">
        <Card className="p-3 text-center"><CheckCircle2 className="h-5 w-5 mx-auto text-success mb-1" /><div className="text-2xl font-bold font-mono">{submittedToday}</div><div className="text-xs text-muted-foreground">Submitted today</div></Card>
        <Card className="p-3 text-center"><Inbox className="h-5 w-5 mx-auto text-warning mb-1" /><div className="text-2xl font-bold font-mono">{drafts}</div><div className="text-xs text-muted-foreground">Drafts</div></Card>
        <Card className="p-3 text-center"><div className="text-2xl font-bold font-mono text-destructive">{pendingMine}</div><div className="text-xs text-muted-foreground">Pending Approvals</div></Card>
      </div>

      <Button className="w-full h-14 text-lg" onClick={() => setShowCapture(true)}>
        <Plus className="h-5 w-5 mr-2" />New Material Indent
      </Button>
    </div>
  );
}
