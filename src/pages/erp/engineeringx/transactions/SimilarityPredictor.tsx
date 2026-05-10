/**
 * @file        src/pages/erp/engineeringx/transactions/SimilarityPredictor.tsx
 * @purpose     AI similarity predictor · drawing selector + ranked list + Ask Dishani conversational layer (zero-touch)
 * @who         Engineering Lead · Designer
 * @when        2026-05-10
 * @sprint      T-Phase-1.A.13 · Q-LOCK-1b + Q-LOCK-6a · Block B.1 · Path B + Dishani conversational layer
 * @iso         ISO 9001:2015 §8.1 · ISO 25010 Usability
 * @whom        Audit Owner · Engineering Lead
 * @decisions   Path B own analysis engine (not FR-73 consumer) · Ask Dishani imported via useDishani hook (zero-touch on canonical)
 * @disciplines FR-30 · FR-50 · FR-67
 * @reuses      engineeringx-analysis-engine · engineeringx-engine listDrawings · components/ask-dishani useDishani
 * @[JWT]       Phase 1 mock similarity scoring · Phase 2 ML embeddings via edge function
 */
import { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Sparkles, MessageCircle } from 'lucide-react';
import { useEntityCode } from '@/hooks/useEntityCode';
import { listDrawings } from '@/lib/engineeringx-engine';
import {
  findSimilarDrawings, getSimilarityExplanation,
} from '@/lib/engineeringx-analysis-engine';
import { useDishani } from '@/components/ask-dishani';
import { parseDrawingCustomTags } from '@/types/engineering-drawing';
import type { Document } from '@/types/docvault';
import type { EngineeringXModule } from '../EngineeringXSidebar.types';

interface Props {
  onNavigate?: (m: EngineeringXModule) => void;
}

export function SimilarityPredictor({ onNavigate }: Props): JSX.Element {
  const { entityCode } = useEntityCode();
  const { openDishani, sendMessage } = useDishani();
  const drawings = useMemo(
    () => (entityCode ? listDrawings(entityCode) : []),
    [entityCode],
  );

  const [selectedId, setSelectedId] = useState<string>('');
  const [results, setResults] = useState<
    Array<{ drawing: Document; score: number; reason: string }>
  >([]);

  const target = useMemo(
    () => drawings.find((d) => d.id === selectedId) ?? null,
    [drawings, selectedId],
  );

  const handleFindSimilar = () => {
    if (!entityCode || !selectedId) return;
    setResults(findSimilarDrawings(entityCode, selectedId, 10));
  };

  const handleAskDishani = (similar: Document, score: number, reason: string) => {
    if (!target) return;
    const tMeta = parseDrawingCustomTags(target.tags?.custom_tags);
    const sMeta = parseDrawingCustomTags(similar.tags?.custom_tags);
    openDishani();
    const ctx = `I'm reviewing drawing "${tMeta.drawing_no ?? target.id}" (${target.title}).
You found "${sMeta.drawing_no ?? similar.id}" (${similar.title}) is ${Math.round(score * 100)}% similar.
Reason: ${reason || getSimilarityExplanation(target, similar)}.
Why might these drawings be similar in engineering practice? What's typically different between such drawings, and what should I check before reusing the similar drawing as a reference?`;
    sendMessage(ctx);
  };

  return (
    <div className="p-6 space-y-6 max-w-5xl">
      <div className="flex items-center gap-3">
        {onNavigate && (
          <Button variant="ghost" size="sm" onClick={() => onNavigate('welcome')}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Back
          </Button>
        )}
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          AI Similarity Predictor
        </h1>
      </div>

      <Card>
        <CardHeader><CardTitle>Find similar drawings</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Reference drawing</Label>
            <Select value={selectedId} onValueChange={setSelectedId}>
              <SelectTrigger><SelectValue placeholder="Select a drawing…" /></SelectTrigger>
              <SelectContent>
                {drawings.map((d) => {
                  const m = parseDrawingCustomTags(d.tags?.custom_tags);
                  return (
                    <SelectItem key={d.id} value={d.id}>
                      {(m.drawing_no ?? d.id.slice(0, 8))} · {d.title}
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
          </div>
          <Button onClick={handleFindSimilar} disabled={!selectedId}>
            <Sparkles className="h-4 w-4 mr-2" /> Find Similar
          </Button>
        </CardContent>
      </Card>

      {results.length > 0 && (
        <Card>
          <CardHeader><CardTitle>Ranked matches</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {results.map(({ drawing, score, reason }) => {
              const m = parseDrawingCustomTags(drawing.tags?.custom_tags);
              return (
                <div
                  key={drawing.id}
                  className="flex items-center justify-between gap-4 p-3 border rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-sm">{m.drawing_no ?? drawing.id.slice(0, 8)}</span>
                      <span className="font-medium truncate">{drawing.title}</span>
                      <Badge variant="secondary">{Math.round(score * 100)}%</Badge>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">{reason}</div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleAskDishani(drawing, score, reason)}
                  >
                    <MessageCircle className="h-4 w-4 mr-1" /> Ask Dishani
                  </Button>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      {results.length === 0 && selectedId && (
        <div className="text-sm text-muted-foreground">
          No similar drawings found · try a different reference drawing.
        </div>
      )}
    </div>
  );
}
