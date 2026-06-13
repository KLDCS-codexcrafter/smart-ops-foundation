/**
 * FirstRunOnboardingBanner.tsx — Sprint W1C-6 · Block 2
 *
 * Shown above the /erp dashboard card grid when erp_group_entities is empty.
 * Two paths: Load Demo (useDemoSeedLoader · 'foundation' module) or
 * Create Company (navigate to Command Center entity flow). Quick add inline.
 * Dismissible per browser. Self-hides once entities exist.
 */
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Sparkles, Plus, Building2, X } from 'lucide-react';
import { useDemoSeedLoader } from '@/hooks/useDemoSeedLoader';
import { QuickCreateEntityDialog } from '@/components/foundation/QuickCreateEntityDialog';

const DISMISS_KEY = 'erp_first_run_banner_dismissed';

function hasEntities(): boolean {
  try {
    const raw = localStorage.getItem('erp_group_entities');
    if (!raw) return false;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) && parsed.length > 0;
  } catch { return false; }
}

export function FirstRunOnboardingBanner() {
  const navigate = useNavigate();
  const { loadModule } = useDemoSeedLoader();
  const [show, setShow] = useState(() => !hasEntities() && !localStorage.getItem(DISMISS_KEY));
  const [quickOpen, setQuickOpen] = useState(false);

  // Re-check on mount in case storage was hydrated late.
  useEffect(() => {
    if (hasEntities()) setShow(false);
  }, []);

  if (!show) return null;

  function handleLoadDemo() {
    loadModule('foundation', 'all');
    setTimeout(() => window.location.reload(), 300);
  }

  function handleDismiss() {
    localStorage.setItem(DISMISS_KEY, '1');
    setShow(false);
  }

  return (
    <>
      <Card className="mb-6 border-primary/30 bg-primary/5">
        <CardContent className="p-5 flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-primary/15 flex items-center justify-center shrink-0">
              <Building2 className="h-5 w-5 text-primary" />
            </div>
            <div className="min-w-0">
              <h3 className="font-semibold text-sm text-foreground">Welcome to Operix</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Load a demo company to explore, or create your own to start working.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Button size="sm" onClick={handleLoadDemo} className="gap-2">
              <Sparkles className="h-3.5 w-3.5" /> Load Demo
            </Button>
            <Button size="sm" variant="outline" onClick={() => setQuickOpen(true)} className="gap-2">
              <Plus className="h-3.5 w-3.5" /> Quick add
            </Button>
            <Button size="sm" variant="ghost" onClick={() => navigate('/erp/command-center')}>
              Create Company
            </Button>
            <Button size="icon" variant="ghost" onClick={handleDismiss} aria-label="Dismiss">
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
      <QuickCreateEntityDialog open={quickOpen} onOpenChange={setQuickOpen} />
    </>
  );
}

export default FirstRunOnboardingBanner;
