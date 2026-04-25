import { Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useLanguage } from '@/hooks/useLanguage';

export function LanguageSwitcher() {
  const { language, setLanguage, languages } = useLanguage();

  function handleSelect(code: string, active: boolean) {
    if (!active) {
      toast.info('Translation coming soon', {
        description: 'This language is being prepared. The UI stays in English until ready.',
      });
      return;
    }
    setLanguage(code as Parameters<typeof setLanguage>[0]);
  }

  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger asChild>
            <Button variant='ghost' size='icon' className='h-8 w-8 relative'>
              <Globe className='h-4 w-4' />
              {/* 2-letter language badge — like a flag indicator */}
              <span className='absolute -bottom-0.5 -right-0.5 text-[8px] font-bold bg-primary text-primary-foreground rounded px-0.5 leading-tight min-w-[14px] text-center'>
                {language.toUpperCase().slice(0, 2)}
              </span>
            </Button>
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent>Select Language</TooltipContent>
      </Tooltip>

      <DropdownMenuContent align='end' className='w-60'>
        <DropdownMenuLabel className='text-xs text-muted-foreground'>
          Language — 23 Indian languages
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <ScrollArea className='h-[320px]'>
          {languages.map(lang => (
            <DropdownMenuItem
              key={lang.code}
              onClick={() => handleSelect(lang.code, lang.active)}
              className={cn(
                'cursor-pointer flex items-center justify-between gap-2 py-2',
                language === lang.code && 'bg-primary/10 text-primary',
                !lang.active && 'opacity-70',
              )}>
              <div className='flex flex-col min-w-0'>
                <span className='text-sm font-medium leading-tight'>{lang.nativeName}</span>
                <span className='text-[10px] text-muted-foreground leading-tight'>{lang.name}</span>
              </div>
              <div className='flex items-center gap-1 shrink-0'>
                {!lang.active && (
                  <Badge variant='secondary' className='text-[9px] px-1 py-0 h-4'>
                    Soon
                  </Badge>
                )}
                {language === lang.code && (
                  <span className='text-xs text-primary font-bold'>✓</span>
                )}
              </div>
            </DropdownMenuItem>
          ))}
        </ScrollArea>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
