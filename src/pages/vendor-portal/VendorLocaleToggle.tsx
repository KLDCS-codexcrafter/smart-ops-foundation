/**
 * @file        src/pages/vendor-portal/VendorLocaleToggle.tsx
 * @purpose     Vendor-portal-scoped locale toggle · D-272 safe (no useERPCompany dep) ·
 *              uses session.entity_code for locale persistence · graceful fallback if no session
 *              (Login page pre-auth path) · EN ↔ हिन्दी switch
 * @sprint      T-Phase-1.A-d.1-VendorPortal-i18n-Branding-ProxyCleanup
 * @decisions   D-NEW-EE vendor-portal-specific LocaleToggle · D-272 self-contained ·
 *              A-d-Q9=D top bar + Login placement · A-d-Q11=B Hindi-only Phase 1
 * @reuses      i18n-engine (getLocale/setLocale · CONSUME ONLY) · vendor-portal-auth-engine.getVendorSession
 */
import { useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getLocale, setLocale, type Locale } from '@/lib/i18n-engine';
import { getVendorSession } from '@/lib/vendor-portal-auth-engine';

export function VendorLocaleToggle(): JSX.Element {
  const entityCode = (() => {
    try {
      return getVendorSession()?.entity_code ?? 'system';
    } catch {
      return 'system';
    }
  })();

  const [locale, setLocaleState] = useState<Locale>(() => getLocale(entityCode));

  const handleToggle = (): void => {
    const next: Locale = locale === 'en' ? 'hi' : 'en';
    setLocale(next, entityCode);
    setLocaleState(next);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 px-2 gap-1 text-xs font-mono"
          onClick={handleToggle}
          aria-label="Toggle language"
        >
          <Globe className="h-3.5 w-3.5" />
          {locale === 'en' ? 'EN' : 'हिन्दी'}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Switch language · EN ↔ हिन्दी</TooltipContent>
    </Tooltip>
  );
}
