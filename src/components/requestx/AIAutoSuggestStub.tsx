/**
 * @file        AIAutoSuggestStub.tsx
 * @sprint      T-Phase-1.2.6f-pre-2 · Block I · OOB-16 · SD-14 stub
 * @[JWT]       GET /api/ml/predict-indent-suggestion
 */
import { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Sparkles } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Suggestion {
  item_name: string;
  reason: string;
  confidence: number;
}

interface Props {
  recentItems?: string[];
}

export function AIAutoSuggestStub({ recentItems = [] }: Props): JSX.Element {
  const suggestions = useMemo<Suggestion[]>(() => {
    // [JWT] GET /api/ml/predict-indent-suggestion
    // Phase 1 · rule-based heuristic on top of recent items.
    const seen = new Set<string>();
    const out: Suggestion[] = [];
    for (const it of recentItems) {
      if (seen.has(it)) continue;
      seen.add(it);
      out.push({ item_name: it, reason: 'Frequently used in recent indents', confidence: 0.72 });
      if (out.length >= 3) break;
    }
    return out;
  }, [recentItems]);

  return (
    <Card>
      <CardContent className="p-4 space-y-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          <p className="text-xs font-medium">AI Suggestions <Badge variant="outline" className="text-[10px] ml-1">Beta</Badge></p>
        </div>
        {suggestions.length === 0 && (
          <p className="text-xs text-muted-foreground">No suggestions yet. Will improve as you create more indents.</p>
        )}
        {suggestions.map(s => (
          <div key={s.item_name} className="flex items-center justify-between text-xs">
            <span>{s.item_name}</span>
            <span className="font-mono text-muted-foreground">{Math.round(s.confidence * 100)}%</span>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}
