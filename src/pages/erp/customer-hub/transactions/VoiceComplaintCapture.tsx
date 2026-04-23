/**
 * VoiceComplaintCapture.tsx — Sprint 13b · Module ch-t-voice-complaint
 * Out-of-box #3. Reuses Sprint 11a transcribeVoice + isSpeechRecognitionSupported.
 */

import { useEffect, useMemo, useState } from 'react';
import { Mic, MicOff, Send, Loader2, AlertCircle, Type } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import {
  isSpeechRecognitionSupported, transcribeVoice,
} from '@/lib/voice-to-order-engine';
import { logAudit } from '@/lib/card-audit-engine';
import {
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
  customerOrdersKey, type CustomerOrder,
} from '@/types/customer-order';

const ENTITY = DEFAULT_ENTITY_SHORTCODE;
const COMPLAINTS_KEY = `erp_customer_complaints_${ENTITY}`;
const DISPUTES_KEY   = `erp_invoice_disputes_${ENTITY}`;
const CONTEXT_KEY    = 'erp_complaint_context';

type ComplaintCategory = 'dispute' | 'return' | 'refund' | 'delivery' | 'quality' | 'general';

interface ComplaintRecord {
  id: string;
  customer_id: string;
  category: ComplaintCategory;
  confidence: number;
  transcript: string;
  order_id: string | null;
  status: 'submitted';
  created_at: string;
  resolution: string | null;
}

interface CategoryResult {
  category: ComplaintCategory;
  confidence: number;
  suggested_workflow: string;
}

const KEYWORD_RULES: { category: ComplaintCategory; keywords: string[]; workflow: string }[] = [
  { category: 'dispute',  keywords: ['dispute', 'short', 'missing', 'damaged', 'wrong item', 'mismatch', 'incorrect'],
    workflow: 'This looks like a delivery dispute — we will raise a formal dispute against the invoice.' },
  { category: 'return',   keywords: ['return', 'send back', 'not needed', 'unwanted'],
    workflow: 'This looks like a return request — we will arrange pickup and refund on receipt.' },
  { category: 'refund',   keywords: ['refund', 'money back', 'cancel and refund'],
    workflow: 'This looks like a refund request — we will process within 7 business days.' },
  { category: 'delivery', keywords: ['late', 'delivery', 'shipment', 'delayed', 'not delivered'],
    workflow: 'This looks like a delivery issue — we will check status with our courier partner.' },
  { category: 'quality',  keywords: ['bad quality', 'stale', 'expired', 'broken', 'spoiled', 'rotten'],
    workflow: 'This looks like a quality complaint — we will raise a return request and refund for you.' },
];

function categorizeComplaint(text: string): CategoryResult {
  const lower = text.toLowerCase();
  let best: { rule: typeof KEYWORD_RULES[number]; hits: number } | null = null;
  for (const rule of KEYWORD_RULES) {
    const hits = rule.keywords.filter(k => lower.includes(k)).length;
    if (hits > 0 && (!best || hits > best.hits)) best = { rule, hits };
  }
  if (!best) {
    return {
      category: 'general',
      confidence: 0.4,
      suggested_workflow: 'Our team will review your complaint and respond within 24 hours.',
    };
  }
  const conf = Math.min(0.95, 0.5 + best.hits * 0.15);
  return {
    category: best.rule.category,
    confidence: Math.round(conf * 100) / 100,
    suggested_workflow: best.rule.workflow,
  };
}

function ls<T>(k: string): T[] {
  try { const r = localStorage.getItem(k); return r ? (JSON.parse(r) as T[]) : []; } catch { return []; }
}
function setLs<T>(k: string, v: T[]): void {
  try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ }
}

function getCustomerId(): string {
  try {
    const raw = localStorage.getItem('4ds_login_credential');
    if (!raw) return 'cust-demo';
    const p = JSON.parse(raw);
    return `cust-${p.value ?? 'demo'}`;
  } catch { return 'cust-demo'; }
}

export function VoiceComplaintCapturePanel() {
  const customerId = getCustomerId();
  const supported = isSpeechRecognitionSupported();
  const [textMode, setTextMode] = useState(!supported);
  const [lang, setLang] = useState<'en-IN' | 'hi-IN'>('en-IN');
  const [transcript, setTranscript] = useState('');
  const [listening, setListening] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [orderNo, setOrderNo] = useState<string | null>(null);

  // Hydrate context from session storage if Orders panel set it
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(CONTEXT_KEY);
      if (raw) {
        const ctx = JSON.parse(raw);
        if (ctx.order_id) { setOrderId(ctx.order_id); setOrderNo(ctx.order_no ?? null); }
      }
    } catch { /* ignore */ }
  }, []);

  const recentOrders = useMemo(
    () => ls<CustomerOrder>(customerOrdersKey(ENTITY))
      .filter(o => o.customer_id === customerId)
      .sort((a, b) => (b.placed_at ?? '').localeCompare(a.placed_at ?? ''))
      .slice(0, 10),
    [customerId],
  );

  const detected = transcript.trim().length >= 5 ? categorizeComplaint(transcript) : null;

  const startRecording = async () => {
    if (!supported) return;
    setListening(true);
    try {
      const text = await transcribeVoice(lang);
      setTranscript(prev => prev ? `${prev} ${text}`.trim() : text);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Voice capture failed');
    } finally {
      setListening(false);
    }
  };

  const submit = () => {
    if (transcript.trim().length < 5) { toast.error('Please describe your complaint (5+ chars)'); return; }
    setSubmitting(true);
    try {
      const cat = detected ?? categorizeComplaint(transcript);
      const now = new Date().toISOString();
      const record: ComplaintRecord = {
        id: `cmp-${Date.now()}`,
        customer_id: customerId,
        category: cat.category,
        confidence: cat.confidence,
        transcript: transcript.trim(),
        order_id: orderId,
        status: 'submitted',
        created_at: now,
        resolution: null,
      };
      const all = ls<ComplaintRecord>(COMPLAINTS_KEY);
      all.push(record);
      setLs(COMPLAINTS_KEY, all);

      // If dispute, also append to invoice disputes (Sprint 11a workflow)
      if (cat.category === 'dispute') {
        const disputes = ls<unknown>(DISPUTES_KEY);
        disputes.push({
          id: `dsp-${Date.now()}`,
          customer_id: customerId,
          order_id: orderId,
          reason: transcript.trim(),
          status: 'open',
          created_at: now,
        });
        setLs(DISPUTES_KEY, disputes);
      }

      logAudit({
        entityCode: ENTITY,
        userId: customerId,
        userName: customerId,
        cardId: 'customer-hub',
        moduleId: 'ch-t-voice-complaint',
        action: 'voucher_post',
        refType: 'complaint',
        refId: record.id,
        refLabel: `${cat.category} (${Math.round(cat.confidence * 100)}%)`,
      });

      try { sessionStorage.removeItem(CONTEXT_KEY); } catch { /* ignore */ }
      toast.success('Complaint submitted — our team will respond within 24 hours');
      setTranscript('');
      setOrderId(null);
      setOrderNo(null);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4 animate-fade-in max-w-3xl">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold flex items-center gap-2">
            <Mic className="h-5 w-5 text-teal-500" />
            Voice Complaint
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Speak in English or Hindi · we will route automatically
          </p>
        </div>
        {supported && (
          <Button
            variant="outline" size="sm"
            onClick={() => setTextMode(t => !t)}
            className="h-8 text-[11px] gap-1"
          >
            <Type className="h-3 w-3" /> {textMode ? 'Use voice' : 'Type instead'}
          </Button>
        )}
      </header>

      {!supported && (
        <Card className="p-3 border-amber-500/40 bg-amber-500/5">
          <p className="text-xs flex items-center gap-2 text-amber-700 dark:text-amber-300">
            <AlertCircle className="h-3.5 w-3.5" />
            Your browser does not support voice capture — please type your complaint below.
          </p>
        </Card>
      )}

      {!textMode && supported && (
        <Card className="p-5 border-teal-500/30 bg-teal-500/5">
          <div className="flex flex-col items-center gap-3">
            <Button
              onClick={startRecording}
              disabled={listening}
              className={`h-32 w-32 rounded-full ${listening ? 'bg-destructive hover:bg-destructive/90' : 'bg-teal-500 hover:bg-teal-600'} text-white`}
            >
              {listening
                ? <MicOff className="h-12 w-12 animate-pulse" />
                : <Mic className="h-12 w-12" />}
            </Button>
            <p className="text-xs text-muted-foreground">
              {listening ? 'Listening… speak now' : 'Tap to record'}
            </p>
            <div className="flex items-center gap-2">
              <Label className="text-[11px]">Language:</Label>
              <select
                value={lang}
                onChange={e => setLang(e.target.value as 'en-IN' | 'hi-IN')}
                disabled={listening}
                className="h-7 rounded-md border border-input bg-background px-2 text-xs"
              >
                <option value="en-IN">English (India)</option>
                <option value="hi-IN">हिन्दी</option>
              </select>
            </div>
          </div>
        </Card>
      )}

      <Card className="p-4 space-y-3">
        <Label className="text-xs font-semibold">Your complaint</Label>
        <Textarea
          value={transcript}
          onChange={e => setTranscript(e.target.value)}
          placeholder="Describe what went wrong…"
          rows={5}
          className="text-sm"
        />
        {detected && (
          <div className="rounded-lg border border-teal-500/30 bg-teal-500/5 p-3 space-y-1.5">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-teal-500/40 text-teal-700 dark:text-teal-300 capitalize">
                {detected.category}
              </Badge>
              <span className="text-[11px] text-muted-foreground">
                {Math.round(detected.confidence * 100)}% confidence
              </span>
            </div>
            <p className="text-xs text-foreground">{detected.suggested_workflow}</p>
          </div>
        )}

        {orderNo ? (
          <p className="text-[11px] text-muted-foreground bg-muted px-2 py-1.5 rounded">
            Regarding order <span className="font-mono font-semibold text-foreground">{orderNo}</span>
            {' · '}
            <button onClick={() => { setOrderId(null); setOrderNo(null); }} className="underline">Clear</button>
          </p>
        ) : (
          <div>
            <Label className="text-[11px] text-muted-foreground">Optional · link to order</Label>
            <select
              value={orderId ?? ''}
              onChange={e => {
                const id = e.target.value || null;
                setOrderId(id);
                setOrderNo(recentOrders.find(o => o.id === id)?.order_no ?? null);
              }}
              className="w-full h-9 rounded-md border border-input bg-background px-2 text-xs mt-1"
            >
              <option value="">No specific order</option>
              {recentOrders.map(o => (
                <option key={o.id} value={o.id}>{o.order_no}</option>
              ))}
            </select>
          </div>
        )}

        <Button
          onClick={submit}
          disabled={submitting || transcript.trim().length < 5}
          className="w-full bg-teal-500 hover:bg-teal-600 text-white"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          Submit Complaint
        </Button>
      </Card>
    </div>
  );
}

export default VoiceComplaintCapturePanel;
