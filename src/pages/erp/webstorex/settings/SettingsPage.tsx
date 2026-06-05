/**
 * @file        src/pages/erp/webstorex/settings/SettingsPage.tsx
 * @sprint      Sprint 149 · T-WebStoreX-A11.1
 */
import { useEffect, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { useCurrentUser } from '@/hooks/useCurrentUser';
import { getStoreSettings, updateStoreSettings } from '@/lib/webstorex-engine';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';

export function SettingsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const user = useCurrentUser();
  const [storeName, setStoreName] = useState('');
  const [tagline, setTagline] = useState('');
  const [supportPhone, setSupportPhone] = useState('');
  const [supportEmail, setSupportEmail] = useState('');
  const [gstNote, setGstNote] = useState('');
  const [shipping, setShipping] = useState('');
  const [returns, setReturns] = useState('');
  const [terms, setTerms] = useState('');

  useEffect(() => {
    if (!entityCode) return;
    const s = getStoreSettings(entityCode);
    setStoreName(s.storeName); setTagline(s.tagline ?? '');
    setSupportPhone(s.supportPhone ?? ''); setSupportEmail(s.supportEmail ?? '');
    setGstNote(s.gstInvoiceNote);
    setShipping(s.policies.shipping ?? ''); setReturns(s.policies.returns ?? ''); setTerms(s.policies.terms ?? '');
  }, [entityCode]);

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  const onSave = (): void => {
    try {
      updateStoreSettings(entityCode, user?.id ?? 'demo-user', {
        storeName, tagline, supportPhone, supportEmail, gstInvoiceNote: gstNote,
        policies: { shipping, returns, terms },
      });
      toast.success('Settings saved');
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <div className="p-6 space-y-4 animate-fade-in max-w-3xl">
      <div>
        <h1 className="text-xl font-semibold">Store Settings</h1>
        <p className="text-xs text-muted-foreground">Identity, support contacts, and policy snippets.</p>
      </div>
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Identity</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1"><Label>Store name</Label><Input value={storeName} onChange={(e) => setStoreName(e.target.value)} /></div>
            <div className="space-y-1"><Label>Tagline</Label><Input value={tagline} onChange={(e) => setTagline(e.target.value)} /></div>
            <div className="space-y-1"><Label>Support phone</Label><Input value={supportPhone} onChange={(e) => setSupportPhone(e.target.value)} className="font-mono" /></div>
            <div className="space-y-1"><Label>Support email</Label><Input value={supportEmail} onChange={(e) => setSupportEmail(e.target.value)} /></div>
          </div>
          <div className="space-y-1"><Label>GST invoice note</Label><Input value={gstNote} onChange={(e) => setGstNote(e.target.value)} /></div>
        </CardContent>
      </Card>
      <Card className="glass-card">
        <CardHeader><CardTitle className="text-base">Policies</CardTitle></CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1"><Label>Shipping</Label><Textarea value={shipping} onChange={(e) => setShipping(e.target.value)} /></div>
          <div className="space-y-1"><Label>Returns</Label><Textarea value={returns} onChange={(e) => setReturns(e.target.value)} /></div>
          <div className="space-y-1"><Label>Terms</Label><Textarea value={terms} onChange={(e) => setTerms(e.target.value)} /></div>
        </CardContent>
      </Card>
      <div className="flex justify-end"><Button onClick={onSave}>Save settings</Button></div>
    </div>
  );
}
