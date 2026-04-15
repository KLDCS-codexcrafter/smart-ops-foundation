/**
 * Profile.tsx — Universal user profile page
 * Route: /profile and /profile?tab=settings|display|notifications|security
 * Used by: all user types from UserProfileDropdown > View Profile
 * Layout: standalone — not TowerLayout, BridgeLayout, or CustomerLayout
 * Data: all mock — [JWT] comments mark real API replacement points
 * NO ThemeToggle (stays in header), NO duplicate notification toggles
 */
import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import {
  User, Settings, Monitor, Bell, Shield,
  ArrowLeft, Save, Globe, Lock,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

// ── Mock user data — [JWT] replace with useProfile hook ──────────────
const MOCK_USER = {
  name: 'Arjun Mehta',
  email: 'arjun@smartops.in',
  mobile: '9821234567',
  designation: 'Platform Administrator',
  company: 'SmartOps Industries Pvt Ltd',
  role: 'Administrator',
  division: '',
  department: '',
  employeeId: '',
};

function getInitials(name: string) {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return parts[0]?.[0]?.toUpperCase() ?? 'U';
}

// ── Tab definitions ───────────────────────────────────────────────────
const TABS = [
  { key: 'profile', label: 'Profile', icon: User },
  { key: 'settings', label: 'Settings', icon: Settings },
  { key: 'display', label: 'Display', icon: Monitor },
  { key: 'notifications', label: 'Notifications', icon: Bell },
  { key: 'security', label: 'Security', icon: Shield },
] as const;
type TabKey = typeof TABS[number]['key'];

// ── Language Grid (used in Settings tab) ─────────────────────────────
function LanguageGrid() {
  const { language, setLanguage, languages } = useLanguage();
  return (
    <div>
      <p className='text-sm font-semibold text-foreground mb-1'>Display Language</p>
      <p className='text-xs text-muted-foreground mb-4'>
        Choose the language for the 4DSmartOps interface. English is fully available.
        Other languages are being prepared and will activate automatically when ready.
      </p>
      <div className='grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2'>
        {languages.map(lang => (
          <button
            key={lang.code}
            onClick={() => {
              if (!lang.active) {
                toast.info('Translation coming soon', {
                  description: lang.name + ' translation is being prepared.',
                });
                return;
              }
              setLanguage(lang.code);
              toast.success('Language updated to ' + lang.name);
            }}
            className={cn(
              'flex flex-col items-start gap-0.5 p-3 rounded-xl border text-left transition-colors',
              language === lang.code
                ? 'bg-primary/10 border-primary/30 ring-1 ring-primary/20'
                : 'bg-muted/20 border-border/40 hover:bg-muted/40',
              !lang.active && 'opacity-60',
            )}>
            <span className='text-sm font-medium text-foreground'>{lang.nativeName}</span>
            <span className='text-xs text-muted-foreground'>{lang.name}</span>
            {!lang.active && (
              <Badge variant='outline' className='text-[9px] mt-1'>Soon</Badge>
            )}
            {language === lang.code && (
              <span className='text-[10px] text-primary font-medium mt-0.5'>✓ Active</span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className='bg-card border border-border rounded-xl p-5'>
      <p className='text-sm font-semibold text-foreground mb-4'>{title}</p>
      {children}
    </div>
  );
}

// ── Toggle row ────────────────────────────────────────────────────────
function ToggleRow({ label, desc, checked, onChange }: {
  label: string; desc: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className='flex items-center justify-between py-3'>
      <div>
        <p className='text-sm text-foreground'>{label}</p>
        <p className='text-xs text-muted-foreground'>{desc}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

// ── Field row ────────────────────────────────────────────────────────
function FieldRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className='text-xs font-medium text-muted-foreground mb-1 block'>{label}</label>
      {children}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────
export default function Profile() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const VALID_TABS = TABS.map(t => t.key);
  const rawTab = searchParams.get('tab');
  const activeTab: TabKey = (rawTab && VALID_TABS.includes(rawTab as TabKey))
    ? (rawTab as TabKey) : 'profile';
  const setTab = (t: string) => setSearchParams(t === 'profile' ? {} : { tab: t }, { replace: true });

  // Profile fields
  const [name, setName] = useState(MOCK_USER.name);
  const [mobile, setMobile] = useState(MOCK_USER.mobile);
  const [designation, setDesignation] = useState(MOCK_USER.designation);
  const [saving, setSaving] = useState(false);
  const [savingOrg, setSavingOrg] = useState(false);

  // Settings — organisation
  const [division, setDivision] = useState(MOCK_USER.division);
  const [department, setDepartment] = useState(MOCK_USER.department);
  const [employeeId, setEmployeeId] = useState(MOCK_USER.employeeId);

  // Display — persisted to localStorage
  const [displaySettings, setDisplaySettings] = useState(() => {
    try {
      // [JWT] GET /api/profile/display-settings
      const s = localStorage.getItem('display_settings');
      return s ? JSON.parse(s) : { compactMode: false, animations: true };
    } catch { return { compactMode: false, animations: true }; }
  });
  function updateDisplay(key: string, val: boolean) {
    const updated = { ...displaySettings, [key]: val };
    setDisplaySettings(updated);
    // [JWT] PATCH /api/profile/display-settings
    localStorage.setItem('display_settings', JSON.stringify(updated));
    toast.success('Display setting saved');
  }

  // Notifications — persisted to localStorage
  // These are PLATFORM alerts only — NOT invoice/statement (those are in Customer Portal)
  const [notifSettings, setNotifSettings] = useState(() => {
    try {
      // [JWT] GET /api/profile/notif-settings
      const s = localStorage.getItem('notif_settings');
      return s ? JSON.parse(s) : { syncAlerts: true, securityAlerts: true, maintenanceAlerts: true, productUpdates: false };
    } catch { return { syncAlerts: true, securityAlerts: true, maintenanceAlerts: true, productUpdates: false }; }
  });
  function updateNotif(key: string, val: boolean) {
    const updated = { ...notifSettings, [key]: val };
    setNotifSettings(updated);
    // [JWT] PATCH /api/profile/notif-settings
    localStorage.setItem('notif_settings', JSON.stringify(updated));
    toast.success('Notification preference saved');
  }

  // Security
  const [changingPw, setChangingPw] = useState(false);
  function handleChangePassword() {
    setChangingPw(true);
    setTimeout(() => {
      setChangingPw(false);
      // [JWT] Replace with real: POST /api/auth/password-reset-email
      toast.success('Password reset email sent', {
        description: 'Check ' + MOCK_USER.email + ' for the reset link.',
      });
    }, 1000);
  }

  function handleSaveProfile() {
    setSaving(true);
    setTimeout(() => {
      setSaving(false);
      // [JWT] Replace with: PATCH /api/users/me body: { name, mobile, designation }
      toast.success('Profile saved');
    }, 800);
  }

  function handleSaveOrg() {
    setSavingOrg(true);
    setTimeout(() => {
      setSavingOrg(false);
      // [JWT] Replace with: PATCH /api/users/me body: { division, department, employee_id }
      toast.success('Organisation details saved');
    }, 800);
  }

  return (
    <div className='min-h-screen bg-background'>
      {/* Top bar */}
      <div className='border-b border-border bg-card/80 backdrop-blur-xl'>
        <div className='flex items-center gap-3 px-6 h-14 max-w-5xl mx-auto'>
          <Button variant='ghost' size='icon' className='h-8 w-8 shrink-0' onClick={() => navigate('/welcome')}>
            <ArrowLeft className='h-4 w-4' />
          </Button>
          <Avatar className='h-9 w-9'>
            <AvatarFallback className='bg-primary/10 text-primary text-xs font-semibold'>
              {getInitials(name)}
            </AvatarFallback>
          </Avatar>
          <div className='min-w-0'>
            <p className='text-sm font-semibold text-foreground truncate'>{name}</p>
            <p className='text-[10px] text-muted-foreground font-mono'>{MOCK_USER.role}</p>
          </div>
          <div className='flex-1' />
          <Badge variant='outline' className='text-[9px] font-mono text-muted-foreground/70'>4DSmartOps</Badge>
        </div>
      </div>

      {/* Page body */}
      <div className='max-w-5xl mx-auto px-6 py-6'>
        <Tabs value={activeTab} onValueChange={setTab}>
          {/* Tab list */}
          <TabsList className='bg-muted/30 mb-6'>
            {TABS.map(tab => {
              const Icon = tab.icon;
              return (
                <TabsTrigger key={tab.key} value={tab.key} className='flex items-center gap-1.5 text-xs'>
                  <Icon className='h-3.5 w-3.5' />
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>

          {/* ── TAB: Profile ──────────────────────────────── */}
          <TabsContent value='profile' className='space-y-4'>
            <Section title='Personal Information'>
              {/* Avatar — Phase 2: real upload via storage API */}
              <div className='flex items-center gap-4 mb-5'>
                <Avatar className='h-16 w-16'>
                  <AvatarFallback className='bg-primary/10 text-primary text-lg font-semibold'>
                    {getInitials(name)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <Button variant='outline' size='sm' onClick={() => toast.info('Avatar upload available in Phase 2')}>
                    Change Photo
                  </Button>
                  <p className='text-[10px] text-muted-foreground mt-1'>JPG, PNG up to 2 MB</p>
                </div>
              </div>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <FieldRow label='Full Name'>
                  <Input value={name} onChange={e => setName(e.target.value)} />
                </FieldRow>
                <FieldRow label='Email'>
                  {/* [JWT] Email change needs OTP verification flow */}
                  <Input value={MOCK_USER.email} readOnly className='opacity-60 cursor-not-allowed' />
                  <p className='text-[10px] text-muted-foreground mt-1'>Contact admin to change email</p>
                </FieldRow>
                <FieldRow label='Mobile'>
                  <Input value={mobile} onChange={e => setMobile(e.target.value)} />
                </FieldRow>
                <FieldRow label='Designation'>
                  <Input value={designation} onChange={e => setDesignation(e.target.value)} />
                </FieldRow>
              </div>
              <Separator className='my-4' />
              <FieldRow label='Company'>
                <Input value={MOCK_USER.company} readOnly className='opacity-60 cursor-not-allowed' />
              </FieldRow>
              <FieldRow label='Role'>
                <Input value={MOCK_USER.role} readOnly className='opacity-60 cursor-not-allowed' />
                <p className='text-[10px] text-muted-foreground mt-1'>Assigned by administrator</p>
              </FieldRow>
              <Button
                className='mt-4 bg-gradient-to-r from-primary to-primary/80 text-primary-foreground'
                size='sm'
                onClick={handleSaveProfile}
                disabled={saving}>
                <Save className='h-3.5 w-3.5 mr-1.5' />
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
            </Section>
          </TabsContent>

          {/* ── TAB: Settings ─────────────────────────────── */}
          <TabsContent value='settings' className='space-y-4'>
            <Section title='Organisation'>
              <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                <FieldRow label='Division'>
                  <Input placeholder='e.g. North India' value={division} onChange={e => setDivision(e.target.value)} />
                </FieldRow>
                <FieldRow label='Department'>
                  <Input placeholder='e.g. Finance' value={department} onChange={e => setDepartment(e.target.value)} />
                </FieldRow>
              </div>
              <div className='mt-4'>
                <FieldRow label='Employee ID'>
                  <Input placeholder='e.g. EMP-001' value={employeeId} onChange={e => setEmployeeId(e.target.value)} />
                </FieldRow>
              </div>
              <Button
                variant='outline'
                size='sm'
                className='mt-4'
                onClick={handleSaveOrg}
                disabled={savingOrg}>
                <Save className='h-3.5 w-3.5 mr-1.5' />
                {savingOrg ? 'Saving...' : 'Save'}
              </Button>
            </Section>
            <Section title='Language'>
              <LanguageGrid />
            </Section>
          </TabsContent>

          {/* ── TAB: Display ──────────────────────────────── */}
          <TabsContent value='display' className='space-y-4'>
            <Section title='Display Preferences'>
              {/* NOTE: ThemeToggle is in the header. Display tab = layout preferences only. */}
              <p className='text-xs text-muted-foreground mb-3'>
                Theme (light/dark) is controlled by the Sun/Moon icon in the header.
              </p>
              <ToggleRow
                label='Compact Mode'
                desc='Reduce padding and spacing across the UI for denser information display'
                checked={displaySettings.compactMode}
                onChange={v => updateDisplay('compactMode', v)}
              />
              <Separator />
              <ToggleRow
                label='Animations'
                desc='Enable transitions and motion effects. Disable for accessibility or performance'
                checked={displaySettings.animations}
                onChange={v => updateDisplay('animations', v)}
              />
              <p className='text-xs text-muted-foreground italic mt-4'>
                Layout preferences will apply after page reload. Full theme integration in Phase 2.
              </p>
            </Section>
          </TabsContent>

          {/* ── TAB: Notifications ────────────────────────── */}
          <TabsContent value='notifications' className='space-y-4'>
            <Section title='Platform Notifications'>
              {/* PLATFORM ALERTS ONLY — invoice/statement notifications are in Customer Portal */}
              <p className='text-xs text-muted-foreground mb-3'>
                Control which platform-level events notify you. Customer billing and document
                notifications are managed separately in the Customer Portal.
              </p>
              <ToggleRow
                label='Bridge Sync Alerts'
                desc='Notify when Tally sync fails, agent goes offline, or reconciliation mismatches'
                checked={notifSettings.syncAlerts}
                onChange={v => updateNotif('syncAlerts', v)}
              />
              <Separator />
              <ToggleRow
                label='Security Alerts'
                desc='Notify on failed login attempts, new device logins, and permission changes'
                checked={notifSettings.securityAlerts}
                onChange={v => updateNotif('securityAlerts', v)}
              />
              <Separator />
              <ToggleRow
                label='Maintenance Windows'
                desc='Notify before scheduled platform maintenance and downtime'
                checked={notifSettings.maintenanceAlerts}
                onChange={v => updateNotif('maintenanceAlerts', v)}
              />
              <Separator />
              <ToggleRow
                label='Product Updates'
                desc='New feature releases and module availability announcements'
                checked={notifSettings.productUpdates}
                onChange={v => updateNotif('productUpdates', v)}
              />
            </Section>
          </TabsContent>

          {/* ── TAB: Security ─────────────────────────────── */}
          <TabsContent value='security' className='space-y-4'>
            <Section title='Change Password'>
              <p className='text-xs text-muted-foreground mb-3'>
                A reset link will be sent to {MOCK_USER.email}
              </p>
              <Button
                variant='outline'
                onClick={handleChangePassword}
                disabled={changingPw}>
                <Lock className='h-3.5 w-3.5 mr-1.5' />
                {changingPw ? 'Sending...' : 'Send Reset Link'}
              </Button>
            </Section>
            <Section title='Active Sessions'>
              {/* [JWT] Replace with real: GET /api/auth/sessions */}
              <div className='flex items-center justify-between py-3'>
                <div className='flex items-center gap-3'>
                  <Monitor className='h-4 w-4 text-muted-foreground' />
                  <div>
                    <p className='text-sm text-foreground'>Current Session</p>
                    <p className='text-xs text-muted-foreground'>Chrome · Windows · This device · Started just now</p>
                  </div>
                </div>
                <Badge className='bg-emerald-500/10 text-emerald-600 border-emerald-500/20 text-[10px]'>Active</Badge>
              </div>
            </Section>
            <Section title='Two-Factor Authentication'>
              <div className='flex items-center justify-between py-3'>
                <div className='flex items-center gap-3'>
                  <Shield className='h-4 w-4 text-muted-foreground' />
                  <div>
                    <p className='text-sm text-foreground'>Authenticator App</p>
                    <p className='text-xs text-muted-foreground'>TOTP — Google Authenticator or similar</p>
                  </div>
                </div>
                <Badge variant='outline' className='text-[10px]'>Coming Soon</Badge>
              </div>
            </Section>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
