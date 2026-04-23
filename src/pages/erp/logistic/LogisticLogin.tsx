/**
 * LogisticLogin.tsx — Standalone transporter portal authentication.
 * Sprint 15c-2. Gold (yellow-500) accent. Separate JWT scope from internal ERP.
 * [JWT] On submit -> verifyLogisticCredential -> issueLogisticToken -> persistLogisticSession.
 */
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowRight, Building2, Truck, ShieldCheck, AtSign, Lock, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  verifyLogisticCredential, issueLogisticToken, createLogisticSession,
  persistLogisticSession, recordLogisticActivity, touchLastLogin, loadLogistics,
  type LogisticMasterLite,
} from '@/lib/logistic-auth-engine';

const schema = z.object({
  credential: z.string().min(3, 'Enter your registered code, email, or mobile'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  entity_code: z.string().min(2, 'Entity code is required'),
});
type FormValues = z.infer<typeof schema>;

export default function LogisticLogin() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);
  const [devOptions, setDevOptions] = useState<LogisticMasterLite[]>([]);

  const isLocalhost = typeof window !== 'undefined' &&
    (window.location.hostname.includes('localhost') || window.location.hostname.includes('127.0.0.1'));

  useEffect(() => {
    if (!isLocalhost) return;
    const list = loadLogistics(DEFAULT_ENTITY_SHORTCODE).filter(l => l.portal_enabled && l.password_hash);
    setDevOptions(list);
  }, [isLocalhost]);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { credential: '', password: '', entity_code: DEFAULT_ENTITY_SHORTCODE },
  });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const res = await verifyLogisticCredential(values.credential, values.password, values.entity_code);
    setSubmitting(false);
    if ('error' in res) { toast.error(res.error); return; }

    const token = issueLogisticToken(res.logistic, res.entityCode);
    const session = createLogisticSession(res.logistic, res.entityCode, token);
    persistLogisticSession(session);
    touchLastLogin(res.logistic.id);
    recordLogisticActivity(res.logistic.id, res.entityCode, 'login');

    toast.success(`Welcome, ${res.logistic.partyName}`);
    if (session.must_change_password) {
      navigate('/erp/logistic/profile?tab=security');
    } else {
      navigate('/erp/logistic/dashboard');
    }
  };

  const onDevPick = (logisticId: string) => {
    const l = devOptions.find(x => x.id === logisticId);
    if (!l) return;
    form.setValue('credential', l.partyCode);
    // Dev convenience — temp password is the documented default
    form.setValue('password', 'Welcome@123');
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-10"
        style={{
          background: 'linear-gradient(135deg, hsl(48 96% 53%) 0%, hsl(38 92% 45%) 100%)',
          color: 'hsl(222 47% 11%)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center" style={{ background: 'hsl(222 47% 11% / 0.15)' }}>
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold">Operix Logistic Partner Portal</div>
            <div className="text-[11px] opacity-70">LRs · Invoicing · Rate cards</div>
          </div>
        </div>

        <div className="space-y-5 max-w-sm">
          <h1 className="text-3xl font-bold leading-tight">
            Manage LRs.<br />Invoice instantly.<br />See your rates.
          </h1>
          <p className="text-sm opacity-80">
            Stop the back-and-forth. Accept LRs assigned to you, submit invoices in
            seconds, and see exactly which rate card the manufacturer applies.
          </p>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5">
              <Truck className="h-4 w-4 opacity-80" />
              <span>Confirm pickups before invoicing</span>
            </div>
            <div className="flex items-center gap-2.5">
              <FileText className="h-4 w-4 opacity-80" />
              <span>Submit invoices line-by-line — no CSV required</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 opacity-80" />
              <span>Transparent rate cards · respond to disputes</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] opacity-60">
          Separate JWT scope · Zero data leak between manufacturers and your view
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Logistic sign-in</h2>
            <p className="text-sm text-muted-foreground">
              Use your registered transporter code, email, or mobile.
            </p>
          </div>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4" data-keyboard-form>
              <FormField
                control={form.control}
                name="entity_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Entity code</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input {...field} placeholder="e.g. SMRT" className="pl-9 font-mono uppercase" onKeyDown={onEnterNext} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="credential"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Transporter code / Email / Mobile</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input {...field} placeholder="LOG-000001 or contact@om.in" className="pl-9" onKeyDown={onEnterNext} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Password</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input {...field} type="password" placeholder="••••••••" className="pl-9" onKeyDown={onEnterNext} />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <Button
                type="submit"
                data-primary
                disabled={submitting}
                className="w-full hover:opacity-90"
                style={{ background: 'hsl(48 96% 53%)', color: 'hsl(222 47% 11%)' }}
              >
                {submitting ? (
                  <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…</>
                ) : (
                  <>Sign in <ArrowRight className="h-4 w-4 ml-2" /></>
                )}
              </Button>
            </form>
          </Form>

          {isLocalhost && devOptions.length > 0 && (
            <div className="border border-dashed border-border rounded-lg p-3 space-y-2">
              <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Dev login as</p>
              <Select onValueChange={onDevPick}>
                <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Pick a transporter…" /></SelectTrigger>
                <SelectContent>
                  {devOptions.map(o => (
                    <SelectItem key={o.id} value={o.id} className="text-xs">
                      {o.partyCode} — {o.partyName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">Auto-fills code; uses default password Welcome@123.</p>
            </div>
          )}

          <div className="text-[10px] text-muted-foreground text-center">
            Forgot password? Contact your manufacturer's admin.
          </div>
        </div>
      </div>
    </div>
  );
}
