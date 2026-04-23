/**
 * DistributorLogin.tsx — Standalone partner portal authentication.
 * Sprint 10. Indigo-600 accent (distributor identity, distinct from
 * SalesX orange and ReceivX amber). Separate route + JWT scope from
 * internal ERP login.
 *
 * [JWT] On submit, calls partner-auth-engine.verifyDistributorCredential
 * (mocked to localStorage) → issueDistributorToken → persistDistributorSession.
 * Redirects to /erp/distributor/dashboard.
 */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Loader2, ArrowRight, Building2, Truck, ShieldCheck, Users, AtSign, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { onEnterNext } from '@/lib/keyboard';
import { DEFAULT_ENTITY_SHORTCODE } from '@/lib/default-entity';
import {
  verifyDistributorCredential,
  issueDistributorToken,
  createDistributorSession,
  persistDistributorSession,
} from '@/lib/distributor-auth-engine';

const schema = z.object({
  credential: z.string().min(3, 'Enter your registered email, partner code, or mobile'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  entity_code: z.string().min(2, 'Entity code is required'),
});
type FormValues = z.infer<typeof schema>;

export function DistributorLoginPanel() {
  const navigate = useNavigate();
  const [submitting, setSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { credential: '', password: '', entity_code: DEFAULT_ENTITY_SHORTCODE },
  });

  // [JWT] Replace with: POST /api/partner/auth/login
  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    const res = await verifyDistributorCredential(values.credential, values.password, values.entity_code);
    setSubmitting(false);
    if ('error' in res) {
      toast.error(res.error);
      return;
    }
    const token = issueDistributorToken(res.distributor, res.entityCode);
    const session = createDistributorSession(res.distributor, token, res.entityCode);
    persistDistributorSession(session);
    toast.success(`Welcome, ${res.distributor.legal_name}`);
    navigate('/erp/distributor/dashboard');
  };

  return (
    <div className="min-h-screen grid lg:grid-cols-2 bg-background">
      {/* Left: brand panel */}
      <div
        className="hidden lg:flex flex-col justify-between p-10 text-white"
        style={{
          background:
            'linear-gradient(135deg, hsl(231 48% 48%) 0%, hsl(231 48% 38%) 100%)',
        }}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white/15 flex items-center justify-center">
            <Truck className="h-5 w-5" />
          </div>
          <div>
            <div className="text-base font-bold">Operix Distributor Portal</div>
            <div className="text-[11px] text-white/70">Tier-priced · Real-time · Self-serve</div>
          </div>
        </div>

        <div className="space-y-5 max-w-sm">
          <h1 className="text-3xl font-bold leading-tight">
            Stop calling for invoices.<br />
            See everything, real-time.
          </h1>
          <p className="text-sm text-white/80">
            Tier pricing, credit balance, invoice PDFs, delivery tracking, and
            payment intimation — all in one place. No WhatsApp ping-pong.
          </p>
          <div className="space-y-2.5 text-sm">
            <div className="flex items-center gap-2.5">
              <Building2 className="h-4 w-4 text-white/80" />
              <span>Tier-priced catalog (Gold / Silver / Bronze)</span>
            </div>
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="h-4 w-4 text-white/80" />
              <span>Pay via UPI · record RTGS / NEFT intimations</span>
            </div>
            <div className="flex items-center gap-2.5">
              <Users className="h-4 w-4 text-white/80" />
              <span>Up to 15 users per distributor account</span>
            </div>
          </div>
        </div>

        <div className="text-[10px] text-white/60">
          Separate JWT scope · Zero data leak between internal ERP and your view
        </div>
      </div>

      {/* Right: form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm space-y-6">
          <div className="space-y-1">
            <h2 className="text-2xl font-bold tracking-tight">Distributor sign-in</h2>
            <p className="text-sm text-muted-foreground">
              Use your registered email, partner code, or mobile.
            </p>
          </div>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="space-y-4"
              data-keyboard-form
            >
              <FormField
                control={form.control}
                name="entity_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Entity code</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="e.g. SMRT"
                          className="pl-9 font-mono uppercase"
                          onKeyDown={onEnterNext}
                        />
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
                    <FormLabel className="text-xs">Email / Distributor code / Mobile</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <AtSign className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                          {...field}
                          placeholder="rajesh@sharmatraders.in"
                          className="pl-9"
                          onKeyDown={onEnterNext}
                        />
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
                        <Input
                          {...field}
                          type="password"
                          placeholder="••••••••"
                          className="pl-9"
                          onKeyDown={onEnterNext}
                        />
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
                className="w-full text-white hover:opacity-90"
                style={{ background: 'hsl(231 48% 48%)' }}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" /> Signing in…
                  </>
                ) : (
                  <>
                    Sign in <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>
            </form>
          </Form>

          <div className="text-[10px] text-muted-foreground text-center">
            Lost your access? Contact your sales rep — distributor accounts are
            provisioned by the supplier.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function DistributorLogin() {
  return <DistributorLoginPanel />;
}
