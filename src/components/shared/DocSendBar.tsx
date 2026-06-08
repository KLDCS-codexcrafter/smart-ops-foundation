/**
 * DocSendBar.tsx — Sprint B2 · T-B2-Comm-Outbox · universal send header
 *                  Sprint B3 · WhatsApp enabled via wa.me deep links (additive only)
 *
 * FLOOR CANON: Every transaction, memo, document, and report surface mounts
 * DocSendBar. Born in B.2. WhatsApp lit up in B.3.
 *
 * Honest delivery:
 *   - Email user-class      → mailto + .eml download (their client = their identity)
 *   - Email department/sys  → queued for Wave-2 (PULSE Relay) + .eml fallback
 *   - WA user-class         → wa.me deep link from operator's own WhatsApp (real today)
 *   - WA department/sys     → queued for Wave-2 (BSP) · NEVER wa.me (impersonation)
 *
 * Credentials (SMTP passwords · BSP tokens) are NEVER stored in this app
 * (server-side AES-256-GCM at Wave-2).
 */

import { useMemo, useState } from 'react';
import { Mail, MessageCircle, Download, Printer, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { composeFromDocument, dispatch, buildEml } from '@/lib/communication-engine';
import {
  dispatchWhatsApp,
  resolveWhatsAppRecipient,
  renderWhatsAppMessage,
  normalizePhoneE164,
  WA_MAX_BODY_CHARS,
} from '@/lib/whatsapp-channel-engine';

interface DocSendBarProps {
  objectType: string;
  sourceCard: string;
  sourceRecord: Record<string, unknown> & { id?: string };
  /** Caller-supplied print payload (base64 PDF bytes when available). */
  printPayload?: { name: string; base64: string };
  onPrint?: () => void;
  className?: string;
}

function downloadFile(name: string, content: string, mime: string): void {
  try {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name;
    document.body.appendChild(a); a.click();
    document.body.removeChild(a); URL.revokeObjectURL(url);
  } catch { /* swallow */ }
}

export function DocSendBar(props: DocSendBarProps) {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [open, setOpen] = useState(false);
  const [to, setTo] = useState('');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');

  // B.3 · WhatsApp dialog state
  const [waOpen, setWaOpen] = useState(false);
  const [waPhone, setWaPhone] = useState('');
  const [waBody, setWaBody] = useState('');

  const composed = useMemo(() => {
    if (!open) return null;
    return composeFromDocument({
      entityCode,
      fiscalYearId: 'FY-UNRESOLVED',
      objectType: props.objectType,
      sourceCard: props.sourceCard,
      sourceRecord: props.sourceRecord,
      mergeData: {
        doc_no: (props.sourceRecord.doc_no ?? props.sourceRecord.docNo ?? props.sourceRecord.id ?? '') as string,
        doc_date: (props.sourceRecord.doc_date ?? props.sourceRecord.date ?? '') as string,
        amount: (props.sourceRecord.amount ?? props.sourceRecord.grand_total ?? '') as string,
        entity_name: entityCode,
        recipient_name: (props.sourceRecord.party_name ?? props.sourceRecord.partyName ?? 'Sir/Madam') as string,
      },
      attachment: props.printPayload,
      currentUserName: user?.name ?? 'operator',
    });
  }, [open, entityCode, user?.name, props]);

  // Hydrate fields when opening.
  useMemo(() => {
    if (open && composed) {
      setTo(composed.to_resolved.join(', '));
      setSubject(composed.subject);
      setBody(composed.body_html);
    }
  }, [open, composed]);

  // B.3 · hydrate WhatsApp preview when its dialog opens.
  useMemo(() => {
    if (!waOpen) return;
    const phone = resolveWhatsAppRecipient(props.objectType, props.sourceRecord, entityCode) ?? '';
    const rendered = renderWhatsAppMessage(
      props.objectType,
      {
        doc_no: (props.sourceRecord.doc_no ?? props.sourceRecord.docNo ?? props.sourceRecord.id ?? '') as string,
        doc_date: (props.sourceRecord.doc_date ?? props.sourceRecord.date ?? '') as string,
        amount: (props.sourceRecord.amount ?? props.sourceRecord.grand_total ?? '') as string,
        entity_name: entityCode,
        recipient_name: (props.sourceRecord.party_name ?? props.sourceRecord.partyName ?? 'Sir/Madam') as string,
      },
      entityCode,
      user?.name ?? 'operator',
    );
    setWaPhone(phone);
    setWaBody(rendered.body || '');
  }, [waOpen, entityCode, user?.name, props.objectType, props.sourceCard, props.sourceRecord]);

  const handleSend = () => {
    if (!composed) return;
    const final = {
      ...composed,
      to_resolved: to.split(',').map((x) => x.trim()).filter(Boolean),
      subject,
      body_html: body,
    };
    const res = dispatch(entityCode, final);
    if (res.message.sender_class === 'user' && res.mailto) {
      if (res.eml) downloadFile(`${res.message.subject || 'message'}.eml`, res.eml, 'message/rfc822');
      window.open(res.mailto, '_blank');
      toast.success('Opened your mail client · .eml downloaded as fallback');
    } else {
      if (res.eml) downloadFile(`${res.message.subject || 'message'}.eml`, res.eml, 'message/rfc822');
      toast.success('Queued for Wave-2 (PULSE) · .eml downloaded for manual send');
    }
    setOpen(false);
  };

  const handleDownloadEml = () => {
    if (!composed) return;
    const final = { ...composed, to_resolved: to.split(',').map((x) => x.trim()).filter(Boolean), subject, body_html: body };
    const eml = buildEml(final);
    downloadFile(`${final.subject || 'message'}.eml`, eml, 'message/rfc822');
  };

  const handlePdf = () => {
    if (!props.printPayload) { toast.info('No PDF payload available'); return; }
    try {
      const bin = atob(props.printPayload.base64);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a'); a.href = url; a.download = props.printPayload.name;
      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
    } catch { toast.error('Could not decode PDF'); }
  };

  // B.3 · WhatsApp dispatch handler
  const handleWaSend = () => {
    const normalized = normalizePhoneE164(waPhone);
    if (!normalized) {
      toast.error('Enter a valid phone number (E.164 or 10-digit Indian mobile)');
      return;
    }
    const res = dispatchWhatsApp({
      entityCode,
      objectType: props.objectType,
      sourceCard: props.sourceCard,
      sourceRecord: props.sourceRecord,
      mergeData: {
        doc_no: (props.sourceRecord.doc_no ?? props.sourceRecord.docNo ?? props.sourceRecord.id ?? '') as string,
        doc_date: (props.sourceRecord.doc_date ?? props.sourceRecord.date ?? '') as string,
        amount: (props.sourceRecord.amount ?? props.sourceRecord.grand_total ?? '') as string,
        entity_name: entityCode,
        recipient_name: (props.sourceRecord.party_name ?? props.sourceRecord.partyName ?? 'Sir/Madam') as string,
      },
      overrideRecipient: normalized,
      currentUserName: user?.name ?? 'operator',
      attachmentName: props.printPayload?.name,
    });
    if (!res.ok) {
      if (res.reason === 'no_whatsapp_template') toast.info('No WhatsApp template seeded for this object type · add one in CC → Templates');
      else if (res.reason === 'no_recipient_phone') toast.error('Could not resolve recipient phone');
      else toast.error('WhatsApp dispatch failed');
      return;
    }
    if (res.message?.delivery_mode === 'opened_in_whatsapp' && res.waMeUrl) {
      window.open(res.waMeUrl, '_blank');
      toast.success('Opened WhatsApp · ' + (props.printPayload ? 'attach the downloaded PDF after the chat opens' : 'message text dispatched'));
    } else {
      toast.success('Queued for Wave-2 (PULSE BSP) · WhatsApp dept/system send needs the backend');
    }
    setWaOpen(false);
  };

  const waCount = waBody.length;

  return (
    <div className={`flex items-center gap-2 ${props.className ?? ''}`}>
      <Button size="sm" variant="outline" onClick={() => setOpen(true)} className="gap-1">
        <Mail className="h-3.5 w-3.5" /> Email
      </Button>
      <Button size="sm" variant="outline" onClick={() => setWaOpen(true)} className="gap-1" title="Send via WhatsApp (wa.me deep link)">
        <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
      </Button>
      <Button size="sm" variant="outline" onClick={handlePdf} className="gap-1">
        <Download className="h-3.5 w-3.5" /> Download PDF
      </Button>
      <Button size="sm" variant="outline" onClick={props.onPrint} className="gap-1">
        <Printer className="h-3.5 w-3.5" /> Print
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Send {props.objectType}</DialogTitle>
            <DialogDescription>
              User mail sends from your client now; department mail queues for Wave-2 (PULSE).
              Mail passwords are never stored in the app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">To (comma-separated)</label>
              <Input value={to} onChange={(e) => setTo(e.target.value)} placeholder="party@example.com" className="font-mono text-xs" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Subject</label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">Body</label>
              <Textarea value={body} onChange={(e) => setBody(e.target.value)} rows={8} />
            </div>
            {composed?.attachment_name && (
              <div className="text-xs text-muted-foreground">
                Attachment embedded: <span className="font-mono">{composed.attachment_name}</span>
              </div>
            )}
            <div className="text-[10px] text-muted-foreground border-t border-border pt-2">
              Sender class: <span className="font-mono">{composed?.sender_class}</span> · From: <span className="font-mono">{composed?.from_resolved || '(unconfigured)'}</span>
            </div>
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={handleDownloadEml}>Download .eml only</Button>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSend} className="gap-1"><Send className="h-3.5 w-3.5" /> Send</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* B.3 · WhatsApp dispatch dialog (additive) */}
      <Dialog open={waOpen} onOpenChange={setWaOpen}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Send {props.objectType} via WhatsApp</DialogTitle>
            <DialogDescription>
              User-class opens wa.me from your own WhatsApp (real today). Department/system
              messages queue for Wave-2 (PULSE BSP) — a personal number can&apos;t represent the dept.
              BSP tokens are never stored in the app.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground">Phone (E.164 or 10-digit Indian mobile)</label>
              <Input value={waPhone} onChange={(e) => setWaPhone(e.target.value)} placeholder="+91 98765 43210" className="font-mono text-xs" />
            </div>
            <div>
              <div className="flex items-center justify-between">
                <label className="text-xs text-muted-foreground">Message (plain text · max {WA_MAX_BODY_CHARS} chars)</label>
                <Badge variant={waCount > WA_MAX_BODY_CHARS ? 'destructive' : 'outline'} className="text-[10px]">{waCount} / {WA_MAX_BODY_CHARS}</Badge>
              </div>
              <Textarea value={waBody} onChange={(e) => setWaBody(e.target.value.slice(0, WA_MAX_BODY_CHARS))} rows={8} className="font-mono text-xs" />
            </div>
            {props.printPayload && (
              <div className="text-[11px] text-muted-foreground">
                wa.me cannot pre-attach files · attach <span className="font-mono">{props.printPayload.name}</span> after the chat opens.
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWaOpen(false)}>Cancel</Button>
            <Button onClick={handleWaSend} className="gap-1"><Send className="h-3.5 w-3.5" /> Send via WhatsApp</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DocSendBar;
