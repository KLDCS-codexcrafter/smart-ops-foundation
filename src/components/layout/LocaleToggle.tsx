/**
 * LocaleToggle.tsx — EN ↔ हिन्दी toggle for ERPHeader
 * Sprint T-Phase-1.2.5h-c2 · L-4 closure
 *
 * Persists per-entity via setLocale(locale, entityCode).
 */
import { useState } from 'react';
import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { getLocale, setLocale, type Locale } from '@/lib/i18n-engine';
import { useERPCompany } from '@/components/layout/ERPCompanySelector';

export function LocaleToggle() {
  const { selectedCompany } = useERPCompany();
  const entityCode = selectedCompany?.code ?? 'system';
  const [locale, setLocaleState] = useState<Locale>(() => getLocale(entityCode));

  const toggle = () => {
    const next: Locale = locale === 'en' ? 'hi' : 'en';
    setLocale(next, entityCode);
    setLocaleState(next);
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          variant='ghost'
          size='sm'
          className='h-8 px-2 gap-1 text-xs font-mono'
          onClick={toggle}
          aria-label='Toggle language'>
          <Globe className='h-3.5 w-3.5' />
          {locale === 'en' ? 'EN' : 'हिन्दी'}
        </Button>
      </TooltipTrigger>
      <TooltipContent>Switch language · EN ↔ हिन्दी</TooltipContent>
    </Tooltip>
  );
}
