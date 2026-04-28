/**
 * MobileWaTemplatesPage.tsx — Browse-only WhatsApp templates; tap → open wa.me
 * Sprint T-Phase-1.1.1l-b
 */
import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, MessageSquare, Send } from 'lucide-react';
import { toast } from 'sonner';
import type { MobileSession } from '../MobileRouter';
import {
  type WaTemplate, waTemplatesKey, WA_TEMPLATE_CATEGORY_LABELS,
} from '@/types/wa-template';

function readSession(): MobileSession | null {
  try {
    const raw = sessionStorage.getItem('opx_mobile_session');
    return raw ? (JSON.parse(raw) as MobileSession) : null;
  } catch { return null; }
}

function loadList<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T[]) : [];
  } catch { return []; }
}

export default function MobileWaTemplatesPage() {
  const navigate = useNavigate();
  const session = useMemo(() => readSession(), []);
  const templates = useMemo(
    () => session ? loadList<WaTemplate>(waTemplatesKey(session.entity_code)).filter(t => t.is_active) : [],
    [session],
  );

  if (!session) return null;

  const handleSend = (t: WaTemplate) => {
    const body = t.body
      .replace(/\{salesman\}/g, session.display_name)
      .replace(/\{entity\}/g, session.entity_code);
    window.open(`https://wa.me/?text=${encodeURIComponent(body)}`, '_blank');
    toast.success('Opening WhatsApp');
  };

  return (
    <div className="p-4 max-w-md mx-auto space-y-3 pb-12">
      <div className="flex items-center gap-2 mb-2">
        <Button variant="ghost" size="sm" onClick={() => navigate('/mobile/telecaller')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-base font-semibold">WA Templates</h1>
        <Badge variant="outline" className="text-[10px] ml-auto">{templates.length}</Badge>
      </div>

      {templates.length === 0 ? (
        <Card className="p-6 text-center">
          <MessageSquare className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
          <p className="text-sm font-medium">No templates available</p>
          <p className="text-xs text-muted-foreground mt-1">Manager creates templates on the web.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {templates.map(t => (
            <Card key={t.id} className="p-3 space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{t.template_name}</p>
                  <p className="text-[10px] text-muted-foreground">{WA_TEMPLATE_CATEGORY_LABELS[t.category]}</p>
                </div>
                <Badge variant="outline" className="text-[10px] shrink-0">{t.use_count} uses</Badge>
              </div>
              <p className="text-[11px] text-muted-foreground line-clamp-3 whitespace-pre-wrap">{t.body}</p>
              <Button size="sm" className="w-full text-xs h-8 bg-green-600 hover:bg-green-700" onClick={() => handleSend(t)}>
                <Send className="h-3 w-3 mr-1" /> Send via WhatsApp
              </Button>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
