/**
 * ComingSoonPanel.tsx — Stub for modules not yet built
 */
import { Clock } from 'lucide-react';

interface ComingSoonPanelProps {
  module: string;
}

export function ComingSoonPanel({ module }: ComingSoonPanelProps) {
  const label = module.replace(/^fc-/, '').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return (
    <div className="flex flex-col items-center justify-center h-64 text-muted-foreground">
      <Clock className="h-8 w-8 mb-3 text-muted-foreground/40" />
      <p className="text-lg font-semibold">Coming Soon</p>
      <p className="text-sm mt-1">{label} — will be built in a future sprint</p>
    </div>
  );
}
