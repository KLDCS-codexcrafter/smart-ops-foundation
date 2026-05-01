/**
 * MONEY-MATH-AUDITED · Sprint T-Phase-1.2.5h-c1
 * No money math in this file — only quality scores (0-100) and criteria weight percentages.
 * Marker added for audit trail consistency.
 */
/**
 * CallQualityHub.tsx — Canvas Wave 5 (T-Phase-1.1.1i)
 * Supervisor panel: Quality Criteria · Review Queue · Reviews · Coaching Feedback
 * [JWT] /api/salesx/call-quality
 */
import { useState, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import {
  Plus, Save, Trash2, X, ClipboardCheck, MessageSquare, ListChecks, Star,
} from 'lucide-react';
import { useCallQuality } from '@/hooks/useCallQuality';
import { useCallSessions } from '@/hooks/useCallSessions';
import { useSAMPersons } from '@/hooks/useSAMPersons';
import { useCtrlS } from '@/lib/keyboard';
import type {
  QualityCriterion, CallReview,
  CriterionScore, CoachingActionItem, CoachingActionStatus, ReviewStatus,
} from '@/types/call-quality';
import { REVIEW_STATUS_LABELS, REVIEW_STATUS_COLORS } from '@/types/call-quality';
import { cn } from '@/lib/utils';

type TabKey = 'criteria' | 'queue' | 'reviews' | 'coaching';

interface Props { entityCode: string }

interface CriterionForm {
  editingId: string | null;
  criterion_code: string;
  criterion_name: string;
  description: string;
  weight_pct: number;
  is_active: boolean;
  display_order: number;
}

const blankCriterion = (): CriterionForm => ({
  editingId: null,
  criterion_code: '',
  criterion_name: '',
  description: '',
  weight_pct: 10,
  is_active: true,
  display_order: 1,
});

interface FeedbackForm {
  editingId: string | null;
  telecaller_id: string;
  review_id: string;
  feedback_date: string;
  strengths: string;
  improvements: string;
  action_items: CoachingActionItem[];
}

const blankFeedback = (): FeedbackForm => ({
  editingId: null,
  telecaller_id: '',
  review_id: '',
  feedback_date: new Date().toISOString().split('T')[0],
  strengths: '',
  improvements: '',
  action_items: [],
});

function scoreColor(score: number): string {
  if (score >= 80) return 'text-green-700 bg-green-500/10 border-green-500/30';
  if (score >= 60) return 'text-amber-700 bg-amber-500/10 border-amber-500/30';
  return 'text-red-700 bg-red-500/10 border-red-500/30';
}

export function CallQualityHubPanel({ entityCode }: Props) {
  const {
    criteria, activeCriteria, reviews, feedback,
    saveCriterion, deleteCriterion,
    saveReview, deleteReview, acknowledgeReview, disputeReview,
    saveFeedback, deleteFeedback,
    computeWeightedScore,
  } = useCallQuality(entityCode);
  const { sessions } = useCallSessions(entityCode);
  const { persons } = useSAMPersons(entityCode);

  const [activeTab, setActiveTab] = useState<TabKey>('criteria');

  // ── Criteria form ────────────────────────────────────────────────
  const [cForm, setCForm] = useState<CriterionForm>(blankCriterion);
  const isCriterionActive = !!(cForm.criterion_code.trim() || cForm.editingId);

  const totalWeight = useMemo(
    () => criteria.filter(c => c.is_active).reduce((s, c) => s + c.weight_pct, 0),
    [criteria],
  );

  const handleSaveCriterion = useCallback(() => {
    if (!cForm.criterion_code.trim() || !cForm.criterion_name.trim()) {
      toast.error('Code and Name are required'); return;
    }
    const others = criteria.filter(c => c.id !== cForm.editingId);
    if (others.some(c => c.criterion_code.toUpperCase() === cForm.criterion_code.trim().toUpperCase())) {
      toast.error('Criterion code must be unique'); return;
    }
    saveCriterion({
      id: cForm.editingId ?? undefined,
      entity_id: entityCode,
      criterion_code: cForm.criterion_code.trim().toUpperCase(),
      criterion_name: cForm.criterion_name.trim(),
      description: cForm.description.trim() || null,
      weight_pct: cForm.weight_pct,
      is_active: cForm.is_active,
      display_order: cForm.display_order,
    });
    toast.success(cForm.editingId ? 'Criterion updated' : 'Criterion saved');
    setCForm(blankCriterion());
  }, [cForm, criteria, entityCode, saveCriterion]);
  useCtrlS(isCriterionActive ? handleSaveCriterion : () => {});

  const handleEditCriterion = (c: QualityCriterion) => {
    setCForm({
      editingId: c.id,
      criterion_code: c.criterion_code,
      criterion_name: c.criterion_name,
      description: c.description ?? '',
      weight_pct: c.weight_pct,
      is_active: c.is_active,
      display_order: c.display_order,
    });
    setActiveTab('criteria');
  };

  // ── Review queue / scoring ───────────────────────────────────────
  const [reviewingSessionId, setReviewingSessionId] = useState<string | null>(null);
  const [scoreInputs, setScoreInputs] = useState<Record<string, { score: number; comment: string }>>({});
  const [overallComment, setOverallComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState<ReviewStatus>('completed');

  const reviewedSessionIds = useMemo(() => new Set(reviews.map(r => r.call_session_id)), [reviews]);
  const pendingSessions = useMemo(
    () => sessions.filter(s => !reviewedSessionIds.has(s.id)),
    [sessions, reviewedSessionIds],
  );

  const startReview = (sessionId: string) => {
    setReviewingSessionId(sessionId);
    const init: Record<string, { score: number; comment: string }> = {};
    activeCriteria.forEach(c => { init[c.id] = { score: 80, comment: '' }; });
    setScoreInputs(init);
    setOverallComment('');
    setReviewStatus('completed');
  };

  const liveTotalScore = useMemo(() => {
    const scoresArr: CriterionScore[] = activeCriteria.map(c => ({
      criterion_id: c.id, criterion_code: c.criterion_code, criterion_name: c.criterion_name,
      weight_pct: c.weight_pct,
      score: scoreInputs[c.id]?.score ?? 0,
      comment: scoreInputs[c.id]?.comment ?? null,
    }));
    return computeWeightedScore(scoresArr);
  }, [activeCriteria, scoreInputs, computeWeightedScore]);

  const handleSaveReview = () => {
    const session = sessions.find(s => s.id === reviewingSessionId);
    if (!session) return;
    if (activeCriteria.length === 0) {
      toast.error('Define at least one active criterion first'); return;
    }
    const scoresArr: CriterionScore[] = activeCriteria.map(c => ({
      criterion_id: c.id, criterion_code: c.criterion_code, criterion_name: c.criterion_name,
      weight_pct: c.weight_pct,
      score: scoreInputs[c.id]?.score ?? 0,
      comment: scoreInputs[c.id]?.comment?.trim() || null,
    }));
    saveReview({
      entity_id: entityCode,
      call_session_id: session.id,
      call_session_no: session.session_no,
      telecaller_id: session.telecaller_id,
      telecaller_name: session.telecaller_name,
      reviewer_id: 'supervisor',
      reviewer_name: 'Supervisor',
      reviewed_at: new Date().toISOString(),
      scores: scoresArr,
      total_score: computeWeightedScore(scoresArr),
      status: reviewStatus,
      overall_comment: overallComment.trim() || null,
      agent_acknowledged: false,
      agent_acknowledged_at: null,
    });
    toast.success('Review saved');
    setReviewingSessionId(null);
  };

  // ── Reviews tab expansion ────────────────────────────────────────
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);

  // ── Coaching ─────────────────────────────────────────────────────
  const [fForm, setFForm] = useState<FeedbackForm>(blankFeedback);
  const [filterTelecaller, setFilterTelecaller] = useState<string>('all');
  const isFeedbackActive = !!(fForm.telecaller_id.trim() || fForm.editingId);

  const telecallerOptions = useMemo(
    () => persons.filter(p => p.id.startsWith('tc-') || p.person_code?.startsWith('TC')),
    [persons],
  );

  const reviewsForSelectedAgent = useMemo(
    () => reviews.filter(r => r.telecaller_id === fForm.telecaller_id && r.status === 'completed'),
    [reviews, fForm.telecaller_id],
  );

  const handleAddAction = () => {
    setFForm(f => ({
      ...f,
      action_items: [...f.action_items, {
        id: `ai-${Date.now()}`, text: '', due_date: null, status: 'open', completed_at: null,
      }],
    }));
  };

  const handleSaveFeedback = useCallback(() => {
    if (!fForm.telecaller_id) { toast.error('Select a telecaller'); return; }
    if (!fForm.strengths.trim() && !fForm.improvements.trim()) {
      toast.error('Add strengths or improvements'); return;
    }
    const tcRow = telecallerOptions.find(p => p.id === fForm.telecaller_id);
    saveFeedback({
      id: fForm.editingId ?? undefined,
      entity_id: entityCode,
      review_id: fForm.review_id || null,
      telecaller_id: fForm.telecaller_id,
      telecaller_name: tcRow?.display_name ?? fForm.telecaller_id,
      coach_id: 'supervisor',
      coach_name: 'Supervisor',
      feedback_date: fForm.feedback_date,
      strengths: fForm.strengths.trim(),
      improvements: fForm.improvements.trim(),
      action_items: fForm.action_items.filter(a => a.text.trim()),
      agent_response: null,
      is_acknowledged: false,
      acknowledged_at: null,
    });
    toast.success(fForm.editingId ? 'Feedback updated' : 'Feedback saved');
    setFForm(blankFeedback());
  }, [fForm, telecallerOptions, entityCode, saveFeedback]);
  useCtrlS(isFeedbackActive ? handleSaveFeedback : () => {});

  const filteredFeedback = useMemo(
    () => filterTelecaller === 'all'
      ? [...feedback].sort((a, b) => b.feedback_date.localeCompare(a.feedback_date))
      : feedback.filter(f => f.telecaller_id === filterTelecaller)
                .sort((a, b) => b.feedback_date.localeCompare(a.feedback_date)),
    [feedback, filterTelecaller],
  );

  const avgScore = useMemo(() => {
    const completed = reviews.filter(r => r.status === 'completed');
    if (completed.length === 0) return 0;
    return Math.round(completed.reduce((s, r) => s + r.total_score, 0) / completed.length);
  }, [reviews]);

  return (
    <div className="space-y-4">
      {/* KPI row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <ListChecks className="h-3.5 w-3.5" /> Active Criteria
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{activeCriteria.length}</p>
            <p className="text-[10px] text-muted-foreground">Total weight {totalWeight}%</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <ClipboardCheck className="h-3.5 w-3.5" /> Pending Reviews
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{pendingSessions.length}</p></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <Star className="h-3.5 w-3.5" /> Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className={cn('text-2xl font-mono font-bold', avgScore >= 80 ? 'text-green-700' : avgScore >= 60 ? 'text-amber-700' : 'text-red-700')}>
              {avgScore}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-xs text-muted-foreground flex items-center gap-2">
              <MessageSquare className="h-3.5 w-3.5" /> Open Coaching
            </CardTitle>
          </CardHeader>
          <CardContent><p className="text-2xl font-mono font-bold">{feedback.filter(f => !f.is_acknowledged).length}</p></CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={v => setActiveTab(v as TabKey)}>
        <TabsList>
          <TabsTrigger value="criteria">Criteria</TabsTrigger>
          <TabsTrigger value="queue">Review Queue ({pendingSessions.length})</TabsTrigger>
          <TabsTrigger value="reviews">Reviews ({reviews.length})</TabsTrigger>
          <TabsTrigger value="coaching">Coaching ({feedback.length})</TabsTrigger>
        </TabsList>

        {/* CRITERIA TAB */}
        <TabsContent value="criteria">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader><CardTitle className="text-sm">Criteria Register</CardTitle></CardHeader>
              <CardContent>
                {totalWeight !== 100 && criteria.length > 0 && (
                  <div className="mb-3 text-xs text-amber-700 bg-amber-500/10 border border-amber-500/30 rounded p-2">
                    Active weights total {totalWeight}% — should sum to 100%.
                  </div>
                )}
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="text-right">Weight</TableHead>
                      <TableHead>Active</TableHead>
                      <TableHead className="text-right">Order</TableHead>
                      <TableHead></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {criteria.length === 0 && (
                      <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                        No criteria defined yet
                      </TableCell></TableRow>
                    )}
                    {[...criteria].sort((a, b) => a.display_order - b.display_order).map(c => (
                      <TableRow key={c.id} className="cursor-pointer" onClick={() => handleEditCriterion(c)}>
                        <TableCell className="font-mono text-xs">{c.criterion_code}</TableCell>
                        <TableCell>{c.criterion_name}</TableCell>
                        <TableCell className="text-right font-mono">{c.weight_pct}%</TableCell>
                        <TableCell>
                          <Badge variant={c.is_active ? 'default' : 'outline'} className="text-[10px]">
                            {c.is_active ? 'Active' : 'Inactive'}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-mono">{c.display_order}</TableCell>
                        <TableCell onClick={e => e.stopPropagation()}>
                          <Button size="sm" variant="ghost" onClick={() => deleteCriterion(c.id)}>
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">{cForm.editingId ? 'Edit Criterion' : 'New Criterion'}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Code *</Label>
                  <Input value={cForm.criterion_code}
                    onChange={e => setCForm(f => ({ ...f, criterion_code: e.target.value }))}
                    placeholder="GREET" className="font-mono uppercase" />
                </div>
                <div>
                  <Label className="text-xs">Name *</Label>
                  <Input value={cForm.criterion_name}
                    onChange={e => setCForm(f => ({ ...f, criterion_name: e.target.value }))}
                    placeholder="Greeting & Opening" />
                </div>
                <div>
                  <Label className="text-xs">Description</Label>
                  <Textarea value={cForm.description} rows={2}
                    onChange={e => setCForm(f => ({ ...f, description: e.target.value }))} />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <Label className="text-xs">Weight %</Label>
                    <Input type="number" min={0} max={100} value={cForm.weight_pct}
                      onChange={e => setCForm(f => ({ ...f, weight_pct: Number(e.target.value) }))}
                      className="font-mono" />
                  </div>
                  <div>
                    <Label className="text-xs">Order</Label>
                    <Input type="number" min={1} value={cForm.display_order}
                      onChange={e => setCForm(f => ({ ...f, display_order: Number(e.target.value) }))}
                      className="font-mono" />
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={cForm.is_active}
                    onCheckedChange={v => setCForm(f => ({ ...f, is_active: v }))} />
                  <Label className="text-xs">Active</Label>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveCriterion} size="sm" className="flex-1">
                    <Save className="h-3 w-3 mr-1" /> Save
                  </Button>
                  <Button variant="outline" size="sm"
                    onClick={() => setCForm(blankCriterion())}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* QUEUE TAB */}
        <TabsContent value="queue">
          <Card>
            <CardHeader><CardTitle className="text-sm">Sessions Awaiting Review</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session No</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Telecaller</TableHead>
                    <TableHead>Disposition</TableHead>
                    <TableHead className="text-right">Duration</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingSessions.length === 0 && (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground text-sm py-6">
                      No sessions awaiting review
                    </TableCell></TableRow>
                  )}
                  {pendingSessions.map(s => (
                    <TableRow key={s.id}>
                      <TableCell className="font-mono text-xs">{s.session_no}</TableCell>
                      <TableCell className="text-xs">{s.call_date}</TableCell>
                      <TableCell>{s.telecaller_name}</TableCell>
                      <TableCell><Badge variant="outline" className="text-[10px]">{s.disposition}</Badge></TableCell>
                      <TableCell className="text-right font-mono">{s.duration_seconds}s</TableCell>
                      <TableCell>
                        <Button size="sm" onClick={() => startReview(s.id)}>Review</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {reviewingSessionId && (
                <Card className="mt-4 border-orange-500/30">
                  <CardHeader>
                    <CardTitle className="text-sm flex items-center justify-between">
                      <span>Score Session: {sessions.find(s => s.id === reviewingSessionId)?.session_no}</span>
                      <Badge className={cn('text-sm', scoreColor(liveTotalScore))}>{liveTotalScore} / 100</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="text-xs text-muted-foreground">
                      Notes: {sessions.find(s => s.id === reviewingSessionId)?.notes || '—'}
                    </div>
                    {activeCriteria.length === 0 && (
                      <div className="text-xs text-amber-700 bg-amber-500/10 p-2 rounded">
                        Define active criteria first
                      </div>
                    )}
                    {activeCriteria.map(c => (
                      <div key={c.id} className="grid grid-cols-12 gap-2 items-start border-b pb-2">
                        <div className="col-span-4">
                          <p className="text-sm font-medium">{c.criterion_name}</p>
                          <p className="text-[10px] text-muted-foreground font-mono">{c.criterion_code} · {c.weight_pct}%</p>
                        </div>
                        <div className="col-span-2">
                          <Input type="number" min={0} max={100}
                            value={scoreInputs[c.id]?.score ?? 0}
                            onChange={e => setScoreInputs(s => ({
                              ...s, [c.id]: { score: Number(e.target.value), comment: s[c.id]?.comment ?? '' },
                            }))}
                            className="font-mono" />
                        </div>
                        <div className="col-span-6">
                          <Input value={scoreInputs[c.id]?.comment ?? ''}
                            onChange={e => setScoreInputs(s => ({
                              ...s, [c.id]: { score: s[c.id]?.score ?? 0, comment: e.target.value },
                            }))}
                            placeholder="Comment (optional)" />
                        </div>
                      </div>
                    ))}
                    <div>
                      <Label className="text-xs">Overall Comment</Label>
                      <Textarea value={overallComment} rows={2}
                        onChange={e => setOverallComment(e.target.value)} />
                    </div>
                    <div className="flex items-center gap-3">
                      <Label className="text-xs">Status</Label>
                      <Select value={reviewStatus} onValueChange={v => setReviewStatus(v as ReviewStatus)}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_review">In Review</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={handleSaveReview} size="sm">
                        <Save className="h-3 w-3 mr-1" /> Save Review
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setReviewingSessionId(null)}>Cancel</Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* REVIEWS TAB */}
        <TabsContent value="reviews">
          <Card>
            <CardHeader><CardTitle className="text-sm">Completed Reviews</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Session</TableHead>
                    <TableHead>Telecaller</TableHead>
                    <TableHead className="text-right">Score</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewer</TableHead>
                    <TableHead>Acknowledged</TableHead>
                    <TableHead>Reviewed At</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.length === 0 && (
                    <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground text-sm py-6">
                      No reviews yet
                    </TableCell></TableRow>
                  )}
                  {reviews.map(r => (
                    <ReviewRow key={r.id}
                      review={r}
                      expanded={expandedReviewId === r.id}
                      onToggle={() => setExpandedReviewId(expandedReviewId === r.id ? null : r.id)}
                      onDelete={() => deleteReview(r.id)}
                      onAck={() => acknowledgeReview(r.id)}
                      onDispute={() => disputeReview(r.id)}
                    />
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* COACHING TAB */}
        <TabsContent value="coaching">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-sm flex items-center justify-between">
                  <span>Feedback Log</span>
                  <Select value={filterTelecaller} onValueChange={setFilterTelecaller}>
                    <SelectTrigger className="w-48 h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Telecallers</SelectItem>
                      {telecallerOptions.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {filteredFeedback.length === 0 && (
                  <p className="text-center text-muted-foreground text-sm py-6">No feedback yet</p>
                )}
                {filteredFeedback.map(f => (
                  <div key={f.id} className="border rounded p-3 hover:bg-muted/50">
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-sm font-semibold">{f.telecaller_name}</p>
                      <div className="flex items-center gap-2">
                        <Badge variant={f.is_acknowledged ? 'default' : 'outline'} className="text-[10px]">
                          {f.is_acknowledged ? 'Acknowledged' : 'Pending Ack'}
                        </Badge>
                        <span className="text-[10px] text-muted-foreground font-mono">{f.feedback_date}</span>
                        <Button size="sm" variant="ghost" onClick={() => deleteFeedback(f.id)}>
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>
                    {f.strengths && <p className="text-xs"><span className="font-medium text-green-700">+</span> {f.strengths}</p>}
                    {f.improvements && <p className="text-xs"><span className="font-medium text-amber-700">→</span> {f.improvements}</p>}
                    <p className="text-[10px] text-muted-foreground mt-1">{f.action_items.length} action item(s)</p>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader><CardTitle className="text-sm">{fForm.editingId ? 'Edit Feedback' : 'New Feedback'}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <Label className="text-xs">Telecaller *</Label>
                  <Select value={fForm.telecaller_id}
                    onValueChange={v => setFForm(f => ({ ...f, telecaller_id: v, review_id: '' }))}>
                    <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      {telecallerOptions.map(p => (
                        <SelectItem key={p.id} value={p.id}>{p.display_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Linked Review</Label>
                  <Select value={fForm.review_id || 'none'}
                    onValueChange={v => setFForm(f => ({ ...f, review_id: v === 'none' ? '' : v }))}>
                    <SelectTrigger><SelectValue placeholder="Optional" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">None</SelectItem>
                      {reviewsForSelectedAgent.map(r => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.call_session_no} (Score {r.total_score})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label className="text-xs">Feedback Date</Label>
                  <SmartDateInput value={fForm.feedback_date}
                    onChange={v => setFForm(f => ({ ...f, feedback_date: v }))} />
                </div>
                <div>
                  <Label className="text-xs">Strengths</Label>
                  <Textarea value={fForm.strengths} rows={3}
                    onChange={e => setFForm(f => ({ ...f, strengths: e.target.value }))} />
                </div>
                <div>
                  <Label className="text-xs">Improvements</Label>
                  <Textarea value={fForm.improvements} rows={3}
                    onChange={e => setFForm(f => ({ ...f, improvements: e.target.value }))} />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <Label className="text-xs">Action Items</Label>
                    <Button size="sm" variant="outline" onClick={handleAddAction}>
                      <Plus className="h-3 w-3 mr-1" /> Add
                    </Button>
                  </div>
                  <div className="space-y-2">
                    {fForm.action_items.map((a, idx) => (
                      <div key={a.id} className="grid grid-cols-12 gap-1 items-center">
                        <Input className="col-span-6 text-xs" value={a.text}
                          onChange={e => setFForm(f => ({
                            ...f, action_items: f.action_items.map((x, i) =>
                              i === idx ? { ...x, text: e.target.value } : x),
                          }))}
                          placeholder="Action..." />
                        <Input className="col-span-3 text-xs" type="date" value={a.due_date ?? ''}
                          onChange={e => setFForm(f => ({
                            ...f, action_items: f.action_items.map((x, i) =>
                              i === idx ? { ...x, due_date: e.target.value || null } : x),
                          }))} />
                        <Select value={a.status} onValueChange={(v) => setFForm(f => ({
                          ...f, action_items: f.action_items.map((x, i) =>
                            i === idx ? { ...x, status: v as CoachingActionStatus } : x),
                        }))}>
                          <SelectTrigger className="col-span-2 h-8 text-xs"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="open">Open</SelectItem>
                            <SelectItem value="in_progress">In Progress</SelectItem>
                            <SelectItem value="done">Done</SelectItem>
                            <SelectItem value="dropped">Dropped</SelectItem>
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" className="col-span-1"
                          onClick={() => setFForm(f => ({
                            ...f, action_items: f.action_items.filter((_, i) => i !== idx),
                          }))}>
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSaveFeedback} size="sm" className="flex-1">
                    <Save className="h-3 w-3 mr-1" /> Save Feedback
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => setFForm(blankFeedback())}>
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ReviewRowProps {
  review: CallReview;
  expanded: boolean;
  onToggle: () => void;
  onDelete: () => void;
  onAck: () => void;
  onDispute: () => void;
}

function ReviewRow({ review: r, expanded, onToggle, onDelete, onAck, onDispute }: ReviewRowProps) {
  return (
    <>
      <TableRow className="cursor-pointer" onClick={onToggle}>
        <TableCell className="font-mono text-xs">{r.call_session_no}</TableCell>
        <TableCell>{r.telecaller_name}</TableCell>
        <TableCell className="text-right">
          <Badge className={cn('font-mono', scoreColor(r.total_score))}>{r.total_score}</Badge>
        </TableCell>
        <TableCell>
          <Badge className={cn('text-[10px] border', REVIEW_STATUS_COLORS[r.status])}>
            {REVIEW_STATUS_LABELS[r.status]}
          </Badge>
        </TableCell>
        <TableCell className="text-xs">{r.reviewer_name}</TableCell>
        <TableCell>
          <Badge variant={r.agent_acknowledged ? 'default' : 'outline'} className="text-[10px]">
            {r.agent_acknowledged ? 'Yes' : 'No'}
          </Badge>
        </TableCell>
        <TableCell className="text-[10px] text-muted-foreground">{r.reviewed_at.split('T')[0]}</TableCell>
        <TableCell onClick={e => e.stopPropagation()}>
          <Button size="sm" variant="ghost" onClick={onDelete}><Trash2 className="h-3 w-3" /></Button>
        </TableCell>
      </TableRow>
      {expanded && (
        <TableRow>
          <TableCell colSpan={8} className="bg-muted/30">
            <div className="space-y-2 p-2">
              {r.scores.map(s => (
                <div key={s.criterion_id} className="grid grid-cols-12 gap-2 items-center text-xs">
                  <span className="col-span-3 font-mono">{s.criterion_code}</span>
                  <span className="col-span-3">{s.criterion_name}</span>
                  <span className="col-span-1 font-mono">{s.weight_pct}%</span>
                  <Badge className={cn('col-span-1 font-mono justify-center', scoreColor(s.score))}>{s.score}</Badge>
                  <span className="col-span-4 text-muted-foreground">{s.comment ?? '—'}</span>
                </div>
              ))}
              {r.overall_comment && (
                <p className="text-xs italic mt-2">"{r.overall_comment}"</p>
              )}
              <div className="flex gap-2 mt-2">
                <Button size="sm" variant="outline" onClick={onAck} disabled={r.agent_acknowledged}
                  title="Acknowledge as agent (Phase 2 will scope to agent role)">
                  Acknowledge
                </Button>
                <Button size="sm" variant="outline" onClick={onDispute} disabled={r.status === 'disputed'}>
                  Dispute
                </Button>
              </div>
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default CallQualityHubPanel;
