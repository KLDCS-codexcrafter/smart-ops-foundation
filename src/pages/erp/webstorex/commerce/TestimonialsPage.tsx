/**
 * @file        src/pages/erp/webstorex/commerce/TestimonialsPage.tsx
 * @sprint      Sprint 150 · T-WebStoreX-A11.2 · DP-WS-17
 */
import { useCallback, useMemo, useState } from 'react';
import { useEntityCode } from '@/hooks/useEntityCode';
import {
  listTestimonials, createTestimonial, deleteTestimonial, setTestimonialPublished,
} from '@/lib/webstorex-commerce-engine';
import type { WsTestimonial } from '@/types/webstorex';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Plus, Star, Trash2 } from 'lucide-react';

export function TestimonialsPage(): JSX.Element {
  const { entityCode } = useEntityCode();
  const [tick, setTick] = useState(0);
  const reload = useCallback(() => setTick((t) => t + 1), []);
  const [open, setOpen] = useState(false);

  const all = useMemo<WsTestimonial[]>(
    () => entityCode ? listTestimonials(entityCode) : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [entityCode, tick],
  );

  if (!entityCode) return <div className="p-6 text-sm text-muted-foreground">Select a company to continue.</div>;

  return (
    <div className="p-6 space-y-4 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold">Testimonials</h1>
          <p className="text-xs text-muted-foreground">{all.length} testimonial{all.length === 1 ? '' : 's'} · live reviews land in P2BB</p>
        </div>
        <Button size="sm" onClick={() => setOpen(true)}><Plus className="h-4 w-4 mr-1" />New</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {all.length === 0 ? (
          <Card className="glass-card md:col-span-2"><CardContent className="p-8 text-center text-sm text-muted-foreground">No testimonials yet.</CardContent></Card>
        ) : all.map(t => (
          <Card key={t.id} className="glass-card">
            <CardContent className="p-4 space-y-2">
              <div className="flex items-start justify-between">
                <div>
                  <div className="font-semibold">{t.customerName}</div>
                  {t.company && <div className="text-xs text-muted-foreground">{t.company}</div>}
                </div>
                <Badge variant={t.isPublished ? 'default' : 'secondary'}>{t.isPublished ? 'Published' : 'Draft'}</Badge>
              </div>
              {t.rating != null && (
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={`h-3.5 w-3.5 ${i < (t.rating ?? 0) ? 'fill-warning text-warning' : 'text-muted-foreground'}`} />
                  ))}
                </div>
              )}
              <p className="text-sm italic">"{t.text}"</p>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => { setTestimonialPublished(entityCode, t.id, !t.isPublished); reload(); }}>
                  {t.isPublished ? 'Unpublish' : 'Publish'}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => { deleteTestimonial(entityCode, t.id); reload(); }}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <NewDialog open={open} onOpenChange={setOpen} entityCode={entityCode} onDone={reload} />
    </div>
  );
}

function NewDialog(props: { open: boolean; onOpenChange: (o: boolean) => void; entityCode: string; onDone: () => void }): JSX.Element {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [text, setText] = useState('');
  const [rating, setRating] = useState('5');

  const submit = (): void => {
    try {
      createTestimonial(props.entityCode, {
        customerName: name.trim(),
        company: company.trim() || null,
        text: text.trim(),
        rating: rating ? Number(rating) : null,
        isPublished: false, createdByUserId: 'system',
      });
      toast.success('Testimonial saved');
      setName(''); setCompany(''); setText(''); setRating('5');
      props.onOpenChange(false); props.onDone();
    } catch (e) { toast.error((e as Error).message); }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>New testimonial</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Customer name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
          <div><Label>Company (optional)</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} /></div>
          <div><Label>Testimonial</Label><Textarea value={text} onChange={(e) => setText(e.target.value)} rows={4} /></div>
          <div><Label>Rating (1-5)</Label><Input type="number" min="1" max="5" value={rating} onChange={(e) => setRating(e.target.value)} /></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => props.onOpenChange(false)}>Cancel</Button>
          <Button onClick={submit}>Save</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
