/**
 * @file        src/pages/erp/comply360/_shared/CrossMenuLinkCard.tsx
 * @purpose     Reusable cross-mega-menu link card for related-module navigation polish
 * @sprint      Sprint 88 · T-Phase-5.E.5.0 · L1
 */
import { memo } from 'react';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';
import { Card } from '@/components/ui/card';
import type { Comply360Module } from '../Comply360Sidebar.types';

interface Props {
  icon: LucideIcon;
  title: string;
  description: string;
  target: Comply360Module;
  onNavigate: (m: Comply360Module) => void;
  badge?: string;
}

function CrossMenuLinkCardInner({ icon: Icon, title, description, target, onNavigate, badge }: Props): JSX.Element {
  return (
    <Card
      role="button"
      tabIndex={0}
      className="p-4 cursor-pointer hover:border-primary transition-colors"
      onClick={() => onNavigate(target)}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onNavigate(target); }}
    >
      <div className="flex items-start gap-3">
        <Icon className="h-5 w-5 text-primary mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <h3 className="font-semibold text-sm">{title}</h3>
            {badge && (
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-primary/10 text-primary">{badge}</span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        </div>
        <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
      </div>
    </Card>
  );
}

export const CrossMenuLinkCard = memo(CrossMenuLinkCardInner);
