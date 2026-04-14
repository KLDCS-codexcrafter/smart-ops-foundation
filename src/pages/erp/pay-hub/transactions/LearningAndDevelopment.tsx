import React, { useState, useMemo, useCallback } from 'react';
import { format, parseISO, differenceInDays } from 'date-fns';
import { SidebarProvider } from '@/components/ui/sidebar';
import { ERPHeader } from '@/components/layout/ERPHeader';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { SmartDateInput } from '@/components/ui/smart-date-input';
import { Separator } from '@/components/ui/separator';
import { BookOpen, GraduationCap, Grid3X3, Award, Plus, Check,
  X, AlertTriangle, Filter, Search } from 'lucide-react';
import { toast } from 'sonner';
import type { TrainingCourse, TrainingEnrollment, SkillRecord,
  CertificationRecord, LearningTab, CourseType, EnrollmentStatus,
  ProficiencyLevel } from '@/types/learning';
import { TRAINING_COURSES_KEY, ENROLLMENTS_KEY, EMPLOYEE_SKILLS_KEY,
  CERTIFICATIONS_KEY, COURSE_TYPE_LABELS, ENROLLMENT_STATUS_COLORS,
  PROFICIENCY_LABELS, PROFICIENCY_COLORS, SKILL_CATALOG,
  SKILL_CATEGORIES } from '@/types/learning';
import type { Employee } from '@/types/employee';
import { EMPLOYEES_KEY } from '@/types/employee';
import { toIndianFormat, amountInputProps, onEnterNext, useCtrlS } from '@/lib/keyboard';
import type { CourseStatus } from '@/types/learning';

/* ─────────────────────────────────────────────────────────── */

interface LearningAndDevelopmentPanelProps { defaultTab?: LearningTab; }

export function LearningAndDevelopmentPanel({ defaultTab = 'catalog' }: LearningAndDevelopmentPanelProps) {

  const activeEmployees = useMemo<Employee[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/employees
      const raw = localStorage.getItem(EMPLOYEES_KEY);
      if (raw) return (JSON.parse(raw) as Employee[]).filter(e => e.status === 'active');
    } catch { /* ignore */ }
    return [];
  }, []);

  const [courses, setCourses] = useState<TrainingCourse[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/learning/courses
      const raw = localStorage.getItem(TRAINING_COURSES_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveCourses = (items: TrainingCourse[]) => {
    // [JWT] PUT /api/pay-hub/learning/courses
    localStorage.setItem(TRAINING_COURSES_KEY, JSON.stringify(items));
    setCourses(items);
  };

  const [enrollments, setEnrollments] = useState<TrainingEnrollment[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/learning/enrollments
      const raw = localStorage.getItem(ENROLLMENTS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveEnrollments = (items: TrainingEnrollment[]) => {
    // [JWT] PUT /api/pay-hub/learning/enrollments
    localStorage.setItem(ENROLLMENTS_KEY, JSON.stringify(items));
    setEnrollments(items);
  };

  const [skillRecords, setSkillRecords] = useState<SkillRecord[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/learning/skills
      const raw = localStorage.getItem(EMPLOYEE_SKILLS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveSkillRecords = (items: SkillRecord[]) => {
    // [JWT] PUT /api/pay-hub/learning/skills
    localStorage.setItem(EMPLOYEE_SKILLS_KEY, JSON.stringify(items));
    setSkillRecords(items);
  };

  const [certifications, setCertifications] = useState<CertificationRecord[]>(() => {
    try {
      // [JWT] GET /api/pay-hub/learning/certifications
      const raw = localStorage.getItem(CERTIFICATIONS_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch { return []; }
  });
  const saveCertifications = (items: CertificationRecord[]) => {
    // [JWT] PUT /api/pay-hub/learning/certifications
    localStorage.setItem(CERTIFICATIONS_KEY, JSON.stringify(items));
    setCertifications(items);
  };

  // ── Course Sheet ──────────────────────────────────────────────
  const [courseSheetOpen, setCourseSheetOpen] = useState(false);
  const [courseEditId, setCourseEditId] = useState<string | null>(null);
  const BLANK_COURSE = {
    title: '', category: 'Technical', type: 'instructor_led' as CourseType,
    durationHours: 8, provider: 'Internal', cost: 0,
    description: '', skills: [] as string[], mandatoryFor: [] as string[],
    status: 'draft' as CourseStatus,
  };
  const [courseForm, setCourseForm] = useState(BLANK_COURSE);
  const cuf2 = <K extends keyof typeof BLANK_COURSE>(k: K, v: (typeof BLANK_COURSE)[K]) =>
    setCourseForm(prev => ({ ...prev, [k]: v }));

  const handleCourseSave = useCallback(() => {
    if (!courseSheetOpen) return;
    if (!courseForm.title.trim()) return toast.error('Course title required');
    const now = new Date().toISOString();
    if (courseEditId) {
      saveCourses(courses.map(c => c.id !== courseEditId ? c
        : { ...c, ...courseForm, updated_at: now }));
    } else {
      const code = `TRN-${String(courses.length + 1).padStart(6, '0')}`;
      saveCourses([...courses, {
        ...courseForm, id: `trn-${Date.now()}`,
        courseCode: code, created_at: now, updated_at: now,
      } as TrainingCourse]);
    }
    toast.success('Course saved');
    setCourseSheetOpen(false); setCourseEditId(null); setCourseForm(BLANK_COURSE);
  }, [courseSheetOpen, courseForm, courseEditId, courses]);

  // ── Enrollment Sheet ──────────────────────────────────────────
  const [enrollSheetOpen, setEnrollSheetOpen] = useState(false);
  const [enrollEditId, setEnrollEditId] = useState<string | null>(null);
  const BLANK_ENROLL = {
    courseId: '', courseTitle: '', employeeId: '', employeeCode: '', employeeName: '',
    scheduledDate: '', completedDate: '', score: 0, passed: false,
    feedbackRating: 0, feedbackComment: '', status: 'enrolled' as EnrollmentStatus,
    nominatedBy: 'HR',
  };
  const [enrollForm, setEnrollForm] = useState(BLANK_ENROLL);
  const euf = <K extends keyof typeof BLANK_ENROLL>(k: K, v: (typeof BLANK_ENROLL)[K]) =>
    setEnrollForm(prev => ({ ...prev, [k]: v }));

  const handleEnrollSave = useCallback(() => {
    if (!enrollSheetOpen) return;
    if (!enrollForm.employeeId) return toast.error('Select an employee');
    if (!enrollForm.courseId) return toast.error('Select a course');
    const now = new Date().toISOString();
    if (enrollEditId) {
      saveEnrollments(enrollments.map(e => e.id !== enrollEditId ? e
        : { ...e, ...enrollForm, updated_at: now }));
    } else {
      const code = `ENR-${String(enrollments.length + 1).padStart(6, '0')}`;
      saveEnrollments([...enrollments, {
        ...enrollForm, id: `enr-${Date.now()}`,
        enrollCode: code, created_at: now, updated_at: now,
      } as TrainingEnrollment]);
    }
    toast.success('Enrollment saved');
    setEnrollSheetOpen(false); setEnrollEditId(null); setEnrollForm(BLANK_ENROLL);
  }, [enrollSheetOpen, enrollForm, enrollEditId, enrollments]);

  // ── Skill Sheet ───────────────────────────────────────────────
  const [skillSheetOpen, setSkillSheetOpen] = useState(false);
  const BLANK_SKILL = {
    employeeId: '', employeeCode: '', employeeName: '',
    skillCategory: 'Technical', skillName: '',
    currentLevel: 0 as ProficiencyLevel, targetLevel: 2 as ProficiencyLevel,
    assessedBy: 'HR', assessedDate: '', notes: '',
  };
  const [skillForm, setSkillForm] = useState(BLANK_SKILL);
  const suf = <K extends keyof typeof BLANK_SKILL>(k: K, v: (typeof BLANK_SKILL)[K]) =>
    setSkillForm(prev => ({ ...prev, [k]: v }));

  const handleSkillSave = useCallback(() => {
    if (!skillSheetOpen) return;
    if (!skillForm.employeeId) return toast.error('Select an employee');
    if (!skillForm.skillName) return toast.error('Select a skill');
    const now = new Date().toISOString();
    const existing = skillRecords.find(r =>
      r.employeeId === skillForm.employeeId && r.skillName === skillForm.skillName);
    if (existing) {
      saveSkillRecords(skillRecords.map(r => r.id !== existing.id ? r
        : { ...r, ...skillForm, updated_at: now }));
    } else {
      saveSkillRecords([...skillRecords, {
        ...skillForm, id: `sk-${Date.now()}`,
        created_at: now, updated_at: now,
      } as SkillRecord]);
    }
    toast.success('Skill record saved');
    setSkillSheetOpen(false); setSkillForm(BLANK_SKILL);
  }, [skillSheetOpen, skillForm, skillRecords]);

  // ── Certification Sheet ───────────────────────────────────────
  const [certSheetOpen, setCertSheetOpen] = useState(false);
  const [certEditId, setCertEditId] = useState<string | null>(null);
  const BLANK_CERT = {
    employeeId: '', employeeCode: '', employeeName: '',
    certificationName: '', issuingBody: '', certNumber: '',
    issueDate: '', expiryDate: '', isExpired: false, isRenewable: true,
    renewalReminderDays: 30, fileRef: '', notes: '',
  };
  const [certForm, setCertForm] = useState(BLANK_CERT);
  const certUf = <K extends keyof typeof BLANK_CERT>(k: K, v: (typeof BLANK_CERT)[K]) =>
    setCertForm(prev => ({ ...prev, [k]: v }));

  const handleCertSave = useCallback(() => {
    if (!certSheetOpen) return;
    if (!certForm.employeeId) return toast.error('Select an employee');
    if (!certForm.certificationName.trim()) return toast.error('Certification name required');
    const now = new Date().toISOString();
    const expired = certForm.expiryDate
      ? new Date(certForm.expiryDate) < new Date() : false;
    if (certEditId) {
      saveCertifications(certifications.map(c => c.id !== certEditId ? c
        : { ...c, ...certForm, isExpired: expired, updated_at: now }));
    } else {
      const code = `CERT-${String(certifications.length + 1).padStart(6, '0')}`;
      saveCertifications([...certifications, {
        ...certForm, isExpired: expired,
        id: `cert-${Date.now()}`, certCode: code, created_at: now, updated_at: now,
      } as CertificationRecord]);
    }
    toast.success('Certification saved');
    setCertSheetOpen(false); setCertEditId(null); setCertForm(BLANK_CERT);
  }, [certSheetOpen, certForm, certEditId, certifications]);

  // ── masterSave ────────────────────────────────────────────────
  const masterSave = useCallback(() => {
    if (courseSheetOpen) { handleCourseSave(); return; }
    if (enrollSheetOpen) { handleEnrollSave(); return; }
    if (skillSheetOpen) { handleSkillSave(); return; }
    if (certSheetOpen) { handleCertSave(); return; }
  }, [courseSheetOpen, enrollSheetOpen, skillSheetOpen, certSheetOpen,
    handleCourseSave, handleEnrollSave, handleSkillSave, handleCertSave]);
  useCtrlS(masterSave);

  // ── Skill matrix computation ──────────────────────────────────
  const skillMatrix = useMemo(() => {
    const map = new Map<string, Map<string, ProficiencyLevel>>();
    skillRecords.forEach(r => {
      if (!map.has(r.employeeId)) map.set(r.employeeId, new Map());
      map.get(r.employeeId)!.set(r.skillName, r.currentLevel);
    });
    return map;
  }, [skillRecords]);

  const [matrixCategory, setMatrixCategory] = useState<string>('all');
  const matrixSkills = useMemo(() => {
    return matrixCategory === 'all'
      ? SKILL_CATALOG
      : SKILL_CATALOG.filter(s => s.category === matrixCategory);
  }, [matrixCategory]);

  const matrixEmployees = useMemo(() => {
    const empIds = new Set(skillRecords.map(r => r.employeeId));
    return activeEmployees.filter(e => empIds.has(e.id));
  }, [activeEmployees, skillRecords]);

  // ── Certification expiry warnings ─────────────────────────────
  const expiringCerts = useMemo(() => {
    const today = new Date();
    return certifications.filter(c =>
      c.expiryDate &&
      !c.isExpired &&
      differenceInDays(parseISO(c.expiryDate), today) <= c.renewalReminderDays
    );
  }, [certifications]);

  // ── Filters ───────────────────────────────────────────────────
  const [courseSearch, setCourseSearch] = useState('');
  const [courseCatFilter, setCourseCatFilter] = useState('all');
  const [courseTypeFilter, setCourseTypeFilter] = useState('all');
  const [courseStatusFilter, setCourseStatusFilter] = useState('all');

  const [enrollStatusFilter, setEnrollStatusFilter] = useState('all');
  const [enrollCourseFilter, setEnrollCourseFilter] = useState('all');

  const [skillSearch, setSkillSearch] = useState('');

  const [certEmpFilter, setCertEmpFilter] = useState('all');
  const [certSearch, setCertSearch] = useState('');

  // Filtered data
  const filteredCourses = useMemo(() => {
    let list = courses;
    if (courseCatFilter !== 'all') list = list.filter(c => c.category === courseCatFilter);
    if (courseTypeFilter !== 'all') list = list.filter(c => c.type === courseTypeFilter);
    if (courseStatusFilter !== 'all') list = list.filter(c => c.status === courseStatusFilter);
    if (courseSearch) {
      const q = courseSearch.toLowerCase();
      list = list.filter(c => c.title.toLowerCase().includes(q) || c.courseCode.toLowerCase().includes(q));
    }
    return list;
  }, [courses, courseCatFilter, courseTypeFilter, courseStatusFilter, courseSearch]);

  const filteredEnrollments = useMemo(() => {
    let list = enrollments;
    if (enrollStatusFilter !== 'all') list = list.filter(e => e.status === enrollStatusFilter);
    if (enrollCourseFilter !== 'all') list = list.filter(e => e.courseId === enrollCourseFilter);
    return list;
  }, [enrollments, enrollStatusFilter, enrollCourseFilter]);

  const filteredCerts = useMemo(() => {
    let list = certifications;
    if (certEmpFilter !== 'all') list = list.filter(c => c.employeeId === certEmpFilter);
    if (certSearch) {
      const q = certSearch.toLowerCase();
      list = list.filter(c => c.certificationName.toLowerCase().includes(q) || c.certCode.toLowerCase().includes(q));
    }
    return list;
  }, [certifications, certEmpFilter, certSearch]);

  const uniqueCourseCats = useMemo(() => [...new Set(courses.map(c => c.category))], [courses]);
  const publishedCourses = useMemo(() => courses.filter(c => c.status === 'published'), [courses]);

  // ── Enrollment inline complete ────────────────────────────────
  const [completeEnrollId, setCompleteEnrollId] = useState<string | null>(null);
  const [completeScore, setCompleteScore] = useState(0);
  const [completePassed, setCompletePassed] = useState(false);

  const handleMarkComplete = (id: string) => {
    const now = new Date().toISOString();
    saveEnrollments(enrollments.map(e => e.id !== id ? e : {
      ...e, status: 'completed' as EnrollmentStatus,
      completedDate: now, score: completeScore, passed: completePassed, updated_at: now,
    }));
    setCompleteEnrollId(null);
    setCompleteScore(0);
    setCompletePassed(false);
    toast.success('Marked as completed');
  };

  // Stats
  const enrolledCount = enrollments.filter(e => e.status === 'enrolled').length;
  const inProgressCount = enrollments.filter(e => e.status === 'in_progress').length;
  const completedCount = enrollments.filter(e => e.status === 'completed').length;
  const droppedCount = enrollments.filter(e => e.status === 'dropped').length;

  const statusBadgeClass = (s: CourseStatus) =>
    s === 'draft' ? 'bg-slate-500/10 text-slate-600 border-slate-400/30'
      : s === 'published' ? 'bg-green-500/10 text-green-700 border-green-500/30'
        : 'bg-amber-500/10 text-amber-700 border-amber-500/30';

  return (
    <div className="space-y-4" data-keyboard-form>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-violet-500/15 flex items-center justify-center">
            <GraduationCap className="h-5 w-5 text-violet-500" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-foreground">Learning & Development</h2>
            <p className="text-xs text-muted-foreground">Training LMS · Skill Matrix · Certifications</p>
          </div>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Training Courses</p>
          <p className="text-xl font-bold">{courses.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Active Enrollments</p>
          <p className="text-xl font-bold">{enrolledCount + inProgressCount}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Employees in Skill Matrix</p>
          <p className="text-xl font-bold">{matrixEmployees.length}</p>
        </CardContent></Card>
        <Card><CardContent className="p-3">
          <p className="text-[10px] text-muted-foreground uppercase tracking-wider">Certifications Expiring Soon</p>
          <p className={`text-xl font-bold ${expiringCerts.length > 0 ? 'text-amber-600' : ''}`}>{expiringCerts.length}</p>
        </CardContent></Card>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="catalog" className="text-xs gap-1"><BookOpen className="h-3 w-3" />Training Catalog</TabsTrigger>
          <TabsTrigger value="enrollments" className="text-xs gap-1"><GraduationCap className="h-3 w-3" />Enrollments</TabsTrigger>
          <TabsTrigger value="skills" className="text-xs gap-1"><Grid3X3 className="h-3 w-3" />Skill Matrix</TabsTrigger>
          <TabsTrigger value="certifications" className="text-xs gap-1"><Award className="h-3 w-3" />Certifications</TabsTrigger>
        </TabsList>

        {/* ══════════════════════════════════════════════ */}
        {/* TAB: catalog — Training Catalog               */}
        {/* ══════════════════════════════════════════════ */}
        <TabsContent value="catalog" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search courses..." className="pl-8 h-9 w-48 text-xs"
                  value={courseSearch} onChange={e => setCourseSearch(e.target.value)} onKeyDown={onEnterNext} />
              </div>
              <Select value={courseCatFilter} onValueChange={setCourseCatFilter}>
                <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Category" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  {uniqueCourseCats.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={courseTypeFilter} onValueChange={setCourseTypeFilter}>
                <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Type" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {(Object.entries(COURSE_TYPE_LABELS) as [CourseType, string][]).map(([k, l]) =>
                    <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
              <Select value={courseStatusFilter} onValueChange={setCourseStatusFilter}>
                <SelectTrigger className="h-9 w-32 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="gap-1 text-xs" onClick={() => {
              setCourseEditId(null); setCourseForm(BLANK_COURSE); setCourseSheetOpen(true);
            }}><Plus className="h-3 w-3" />Add Course</Button>
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Title</TableHead>
                  <TableHead className="text-xs">Category</TableHead>
                  <TableHead className="text-xs">Type</TableHead>
                  <TableHead className="text-xs">Duration</TableHead>
                  <TableHead className="text-xs">Provider</TableHead>
                  <TableHead className="text-xs">Cost</TableHead>
                  <TableHead className="text-xs">Skills</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCourses.length === 0 && (
                  <TableRow><TableCell colSpan={10} className="text-center text-xs text-muted-foreground py-8">
                    No courses found. Click "+ Add Course" to create one.
                  </TableCell></TableRow>
                )}
                {filteredCourses.map(c => (
                  <TableRow key={c.id}>
                    <TableCell className="text-xs font-mono">{c.courseCode}</TableCell>
                    <TableCell className="text-xs font-medium">{c.title}</TableCell>
                    <TableCell className="text-xs">{c.category}</TableCell>
                    <TableCell className="text-xs">{COURSE_TYPE_LABELS[c.type]}</TableCell>
                    <TableCell className="text-xs">{c.durationHours}h</TableCell>
                    <TableCell className="text-xs">{c.provider}</TableCell>
                    <TableCell className="text-xs">₹{toIndianFormat(c.cost)}</TableCell>
                    <TableCell className="text-xs max-w-[120px] truncate">{c.skills.join(', ')}</TableCell>
                    <TableCell><Badge variant="outline" className={`text-[10px] ${statusBadgeClass(c.status)}`}>{c.status}</Badge></TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                          setCourseEditId(c.id);
                          setCourseForm({
                            title: c.title, category: c.category, type: c.type,
                            durationHours: c.durationHours, provider: c.provider, cost: c.cost,
                            description: c.description, skills: c.skills, mandatoryFor: c.mandatoryFor,
                            status: c.status,
                          });
                          setCourseSheetOpen(true);
                        }}>Edit</Button>
                        {c.status === 'draft' && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() =>
                            saveCourses(courses.map(x => x.id !== c.id ? x : { ...x, status: 'published' as CourseStatus, updated_at: new Date().toISOString() }))
                          }>Publish</Button>
                        )}
                        {c.status === 'published' && (
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600" onClick={() =>
                            saveCourses(courses.map(x => x.id !== c.id ? x : { ...x, status: 'archived' as CourseStatus, updated_at: new Date().toISOString() }))
                          }>Archive</Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════ */}
        {/* TAB: enrollments — Enrollments & Completions  */}
        {/* ══════════════════════════════════════════════ */}
        <TabsContent value="enrollments" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={enrollStatusFilter} onValueChange={setEnrollStatusFilter}>
                <SelectTrigger className="h-9 w-36 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
              <Select value={enrollCourseFilter} onValueChange={setEnrollCourseFilter}>
                <SelectTrigger className="h-9 w-48 text-xs"><SelectValue placeholder="Course" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Courses</SelectItem>
                  {courses.map(c => <SelectItem key={c.id} value={c.id}>{c.courseCode} — {c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <Button size="sm" className="gap-1 text-xs" onClick={() => {
              setEnrollEditId(null); setEnrollForm(BLANK_ENROLL); setEnrollSheetOpen(true);
            }}><Plus className="h-3 w-3" />Enroll Employee</Button>
          </div>

          {/* Stats bar */}
          <div className="flex gap-3 flex-wrap">
            {[
              { l: 'Enrolled', n: enrolledCount, c: 'text-blue-600' },
              { l: 'In Progress', n: inProgressCount, c: 'text-amber-600' },
              { l: 'Completed', n: completedCount, c: 'text-green-600' },
              { l: 'Dropped', n: droppedCount, c: 'text-red-600' },
            ].map(s => (
              <div key={s.l} className="text-xs"><span className="text-muted-foreground">{s.l}:</span> <span className={`font-bold ${s.c}`}>{s.n}</span></div>
            ))}
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Course</TableHead>
                  <TableHead className="text-xs">Scheduled</TableHead>
                  <TableHead className="text-xs">Completed</TableHead>
                  <TableHead className="text-xs">Score</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Nominated By</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredEnrollments.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">
                    No enrollments found.
                  </TableCell></TableRow>
                )}
                {filteredEnrollments.map(e => (
                  <React.Fragment key={e.id}>
                    <TableRow>
                      <TableCell className="text-xs font-mono">{e.enrollCode}</TableCell>
                      <TableCell className="text-xs">{e.employeeName || e.employeeCode}</TableCell>
                      <TableCell className="text-xs">{e.courseTitle}</TableCell>
                      <TableCell className="text-xs">{e.scheduledDate ? format(parseISO(e.scheduledDate), 'dd-MMM-yyyy') : '—'}</TableCell>
                      <TableCell className="text-xs">{e.completedDate ? format(parseISO(e.completedDate), 'dd-MMM-yyyy') : '—'}</TableCell>
                      <TableCell className="text-xs">
                        {e.status === 'completed' ? (
                          <span className="flex items-center gap-1">
                            {e.score}/100
                            {e.passed ? <Check className="h-3 w-3 text-green-600" /> : <X className="h-3 w-3 text-red-500" />}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell><Badge variant="outline" className={`text-[10px] ${ENROLLMENT_STATUS_COLORS[e.status]}`}>{e.status.replace('_', ' ')}</Badge></TableCell>
                      <TableCell className="text-xs">{e.nominatedBy}</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1">
                          <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                            setEnrollEditId(e.id);
                            setEnrollForm({
                              courseId: e.courseId, courseTitle: e.courseTitle,
                              employeeId: e.employeeId, employeeCode: e.employeeCode, employeeName: e.employeeName,
                              scheduledDate: e.scheduledDate, completedDate: e.completedDate,
                              score: e.score, passed: e.passed,
                              feedbackRating: e.feedbackRating, feedbackComment: e.feedbackComment,
                              status: e.status, nominatedBy: e.nominatedBy,
                            });
                            setEnrollSheetOpen(true);
                          }}>Edit</Button>
                          {e.status === 'enrolled' && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-amber-600" onClick={() =>
                              saveEnrollments(enrollments.map(x => x.id !== e.id ? x : { ...x, status: 'in_progress' as EnrollmentStatus, updated_at: new Date().toISOString() }))
                            }>In Progress</Button>
                          )}
                          {(e.status === 'enrolled' || e.status === 'in_progress') && (
                            <Button size="sm" variant="ghost" className="h-7 text-xs text-green-600" onClick={() =>
                              setCompleteEnrollId(completeEnrollId === e.id ? null : e.id)
                            }>Complete</Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                    {completeEnrollId === e.id && (
                      <TableRow>
                        <TableCell colSpan={9} className="bg-muted/30 px-4 py-3">
                          <div className="flex items-center gap-4 flex-wrap">
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Score (0-100):</Label>
                              <Input type="number" className="h-8 w-20 text-xs" min={0} max={100}
                                value={completeScore} onChange={e2 => setCompleteScore(Number(e2.target.value))} onKeyDown={onEnterNext} />
                            </div>
                            <div className="flex items-center gap-2">
                              <Label className="text-xs">Passed:</Label>
                              <Switch checked={completePassed} onCheckedChange={setCompletePassed} />
                            </div>
                            <Button size="sm" className="h-7 text-xs" onClick={() => handleMarkComplete(e.id)} data-primary>Confirm</Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))}
              </TableBody>
            </Table>
          </div>
        </TabsContent>

        {/* ══════════════════════════════════════════════ */}
        {/* TAB: skills — Skill Matrix                    */}
        {/* ══════════════════════════════════════════════ */}
        <TabsContent value="skills" className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex items-center gap-1 flex-wrap">
                <Button size="sm" variant={matrixCategory === 'all' ? 'default' : 'outline'} className="h-7 text-xs"
                  onClick={() => setMatrixCategory('all')}>All</Button>
                {SKILL_CATEGORIES.map(cat => (
                  <Button key={cat} size="sm" variant={matrixCategory === cat ? 'default' : 'outline'} className="h-7 text-xs"
                    onClick={() => setMatrixCategory(cat)}>{cat}</Button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search employee..." className="pl-8 h-9 w-48 text-xs"
                  value={skillSearch} onChange={e => setSkillSearch(e.target.value)} onKeyDown={onEnterNext} />
              </div>
            </div>
            <Button size="sm" className="gap-1 text-xs" onClick={() => {
              setSkillForm(BLANK_SKILL); setSkillSheetOpen(true);
            }}><Plus className="h-3 w-3" />Assess Skill</Button>
          </div>

          {matrixEmployees.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground text-sm">
              <Grid3X3 className="h-8 w-8 mx-auto mb-2 opacity-40" />
              <p>No skill assessments yet.</p>
              <p className="text-xs mt-1">Click "+ Assess Skill" to start building the matrix.</p>
            </div>
          ) : (
            <>
              <div className="border rounded-lg overflow-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b bg-muted/30">
                      <th className="text-left p-2 font-medium sticky left-0 bg-muted/30 z-10 min-w-[140px]">Employee</th>
                      {matrixSkills.map(s => (
                        <th key={s.skill} className="p-1 font-medium text-center min-w-[40px]">
                          <div className="writing-mode-vertical transform -rotate-45 origin-bottom-left whitespace-nowrap text-[9px] h-16 flex items-end">
                            {s.skill.length > 15 ? s.skill.slice(0, 15) + '…' : s.skill}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {matrixEmployees
                      .filter(emp => !skillSearch || emp.displayName.toLowerCase().includes(skillSearch.toLowerCase()) || emp.empCode.toLowerCase().includes(skillSearch.toLowerCase()))
                      .map(emp => (
                        <tr key={emp.id} className="border-b hover:bg-muted/20">
                          <td className="p-2 font-medium sticky left-0 bg-background z-10">
                            <span className="font-mono text-[10px] text-muted-foreground mr-1">{emp.empCode}</span>
                            {emp.displayName}
                          </td>
                          {matrixSkills.map(s => {
                            const empSkills = skillMatrix.get(emp.id);
                            const level = empSkills?.get(s.skill) ?? (0 as ProficiencyLevel);
                            return (
                              <td key={s.skill} className="p-1 text-center">
                                <button
                                  className={`w-7 h-7 rounded text-[10px] font-bold cursor-pointer ${PROFICIENCY_COLORS[level]}`}
                                  onClick={() => {
                                    setSkillForm({
                                      employeeId: emp.id, employeeCode: emp.empCode, employeeName: emp.displayName,
                                      skillCategory: s.category, skillName: s.skill,
                                      currentLevel: level, targetLevel: Math.min(4, level + 1) as ProficiencyLevel,
                                      assessedBy: 'HR', assessedDate: '', notes: '',
                                    });
                                    setSkillSheetOpen(true);
                                  }}
                                  title={`${emp.displayName} — ${s.skill}: ${PROFICIENCY_LABELS[level]}`}
                                >
                                  {level}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>

              {/* Legend */}
              <div className="flex items-center gap-3 flex-wrap text-xs">
                <span className="text-muted-foreground font-medium">Legend:</span>
                {([0, 1, 2, 3, 4] as ProficiencyLevel[]).map(l => (
                  <div key={l} className="flex items-center gap-1">
                    <div className={`w-5 h-5 rounded text-[10px] font-bold flex items-center justify-center ${PROFICIENCY_COLORS[l]}`}>{l}</div>
                    <span className="text-muted-foreground">{PROFICIENCY_LABELS[l]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </TabsContent>

        {/* ══════════════════════════════════════════════ */}
        {/* TAB: certifications — Certifications          */}
        {/* ══════════════════════════════════════════════ */}
        <TabsContent value="certifications" className="space-y-4">
          {expiringCerts.length > 0 && (
            <Card className="border-amber-500/40 bg-amber-500/5">
              <CardContent className="p-3">
                <div className="flex items-center gap-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700">
                    {expiringCerts.length} certification(s) expiring soon
                  </span>
                </div>
                <div className="space-y-1">
                  {expiringCerts.map(c => (
                    <p key={c.id} className="text-xs text-amber-600">
                      {c.employeeName} — {c.certificationName} — expires {format(parseISO(c.expiryDate), 'dd-MMM-yyyy')}
                      {' '}({differenceInDays(parseISO(c.expiryDate), new Date())} days remaining)
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Select value={certEmpFilter} onValueChange={setCertEmpFilter}>
                <SelectTrigger className="h-9 w-48 text-xs"><SelectValue placeholder="Employee" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Employees</SelectItem>
                  {activeEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.empCode} — {emp.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                <Input placeholder="Search certifications..." className="pl-8 h-9 w-48 text-xs"
                  value={certSearch} onChange={e => setCertSearch(e.target.value)} onKeyDown={onEnterNext} />
              </div>
            </div>
            <Button size="sm" className="gap-1 text-xs" onClick={() => {
              setCertEditId(null); setCertForm(BLANK_CERT); setCertSheetOpen(true);
            }}><Plus className="h-3 w-3" />Add Certification</Button>
          </div>

          <div className="border rounded-lg overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="text-xs">Code</TableHead>
                  <TableHead className="text-xs">Employee</TableHead>
                  <TableHead className="text-xs">Certification</TableHead>
                  <TableHead className="text-xs">Issuing Body</TableHead>
                  <TableHead className="text-xs">Cert No</TableHead>
                  <TableHead className="text-xs">Issue Date</TableHead>
                  <TableHead className="text-xs">Expiry</TableHead>
                  <TableHead className="text-xs">Status</TableHead>
                  <TableHead className="text-xs">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCerts.length === 0 && (
                  <TableRow><TableCell colSpan={9} className="text-center text-xs text-muted-foreground py-8">
                    No certifications found.
                  </TableCell></TableRow>
                )}
                {filteredCerts.map(c => {
                  const daysLeft = c.expiryDate ? differenceInDays(parseISO(c.expiryDate), new Date()) : Infinity;
                  const certStatus = c.isExpired ? 'expired'
                    : (c.expiryDate && daysLeft <= c.renewalReminderDays) ? 'expiring'
                      : 'valid';
                  return (
                    <TableRow key={c.id}>
                      <TableCell className="text-xs font-mono">{c.certCode}</TableCell>
                      <TableCell className="text-xs">{c.employeeName || c.employeeCode}</TableCell>
                      <TableCell className="text-xs font-medium">{c.certificationName}</TableCell>
                      <TableCell className="text-xs">{c.issuingBody}</TableCell>
                      <TableCell className="text-xs font-mono">{c.certNumber || '—'}</TableCell>
                      <TableCell className="text-xs">{c.issueDate ? format(parseISO(c.issueDate), 'dd-MMM-yyyy') : '—'}</TableCell>
                      <TableCell className="text-xs">{c.expiryDate ? format(parseISO(c.expiryDate), 'dd-MMM-yyyy') : 'N/A'}</TableCell>
                      <TableCell>
                        <Badge variant="outline" className={`text-[10px] ${certStatus === 'expired' ? 'bg-red-500/10 text-red-700 border-red-500/30'
                          : certStatus === 'expiring' ? 'bg-amber-500/10 text-amber-700 border-amber-500/30'
                            : 'bg-green-500/10 text-green-700 border-green-500/30'}`}>
                          {certStatus === 'expired' ? 'Expired' : certStatus === 'expiring' ? 'Expiring Soon' : 'Valid'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button size="sm" variant="ghost" className="h-7 text-xs" onClick={() => {
                          setCertEditId(c.id);
                          setCertForm({
                            employeeId: c.employeeId, employeeCode: c.employeeCode, employeeName: c.employeeName,
                            certificationName: c.certificationName, issuingBody: c.issuingBody, certNumber: c.certNumber,
                            issueDate: c.issueDate, expiryDate: c.expiryDate, isExpired: c.isExpired,
                            isRenewable: c.isRenewable, renewalReminderDays: c.renewalReminderDays,
                            fileRef: c.fileRef, notes: c.notes,
                          });
                          setCertSheetOpen(true);
                        }}>Edit</Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </TabsContent>
      </Tabs>

      {/* ════════════════════════════════════════════════════════════ */}
      {/* SHEETS                                                     */}
      {/* ════════════════════════════════════════════════════════════ */}

      {/* Course Sheet */}
      <Sheet open={courseSheetOpen} onOpenChange={setCourseSheetOpen}>
        <SheetContent className="sm:max-w-xl overflow-y-auto">
          <SheetHeader><SheetTitle>{courseEditId ? 'Edit Course' : 'New Training Course'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-1">
              <Label className="text-xs">Title *</Label>
              <Input value={courseForm.title} onChange={e => cuf2('title', e.target.value)} onKeyDown={onEnterNext} placeholder="Course title" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Category</Label>
              <Input value={courseForm.category} onChange={e => cuf2('category', e.target.value)} onKeyDown={onEnterNext} placeholder="e.g. Technical, Leadership" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Type *</Label>
              <Select value={courseForm.type} onValueChange={v => cuf2('type', v as CourseType)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {(Object.entries(COURSE_TYPE_LABELS) as [CourseType, string][]).map(([k, l]) =>
                    <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Duration (hours) *</Label>
                <Input type="number" value={courseForm.durationHours} onChange={e => cuf2('durationHours', Number(e.target.value))} onKeyDown={onEnterNext} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Cost per participant (₹)</Label>
                <Input {...amountInputProps} value={courseForm.cost || ''} onChange={e => cuf2('cost', Number(e.target.value) || 0)} onKeyDown={onEnterNext} />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Provider</Label>
              <Input value={courseForm.provider} onChange={e => cuf2('provider', e.target.value)} onKeyDown={onEnterNext} placeholder="Internal / External vendor" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea value={courseForm.description} onChange={e => cuf2('description', e.target.value)} rows={3} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Skills (comma-separated)</Label>
              <Input value={courseForm.skills.join(', ')}
                onChange={e => cuf2('skills', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                onKeyDown={onEnterNext} placeholder="React, TypeScript, SQL" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Mandatory for (comma-separated)</Label>
              <Input value={courseForm.mandatoryFor.join(', ')}
                onChange={e => cuf2('mandatoryFor', e.target.value.split(',').map(s => s.trim()).filter(Boolean))}
                onKeyDown={onEnterNext} placeholder="Designation/grade codes" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={courseForm.status} onValueChange={v => cuf2('status', v as CourseStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Draft</SelectItem>
                  <SelectItem value="published">Published</SelectItem>
                  <SelectItem value="archived">Archived</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleCourseSave} data-primary>Save Course</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Enrollment Sheet */}
      <Sheet open={enrollSheetOpen} onOpenChange={setEnrollSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{enrollEditId ? 'Edit Enrollment' : 'Enroll Employee'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-1">
              <Label className="text-xs">Employee *</Label>
              <Select value={enrollForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                if (emp) { euf('employeeId', emp.id); euf('employeeCode', emp.empCode); euf('employeeName', emp.displayName); }
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.empCode} — {emp.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Course *</Label>
              <Select value={enrollForm.courseId} onValueChange={v => {
                const c = publishedCourses.find(x => x.id === v);
                if (c) { euf('courseId', c.id); euf('courseTitle', c.title); }
              }}>
                <SelectTrigger><SelectValue placeholder="Select course" /></SelectTrigger>
                <SelectContent>
                  {publishedCourses.map(c => <SelectItem key={c.id} value={c.id}>{c.courseCode} — {c.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Scheduled Date *</Label>
              <SmartDateInput value={enrollForm.scheduledDate} onChange={v => euf('scheduledDate', v)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Nominated By</Label>
              <Select value={enrollForm.nominatedBy} onValueChange={v => euf('nominatedBy', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="Self">Self</SelectItem>
                  <SelectItem value="Manager">Manager</SelectItem>
                  <SelectItem value="HR">HR</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={enrollForm.status} onValueChange={v => euf('status', v as EnrollmentStatus)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="enrolled">Enrolled</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="dropped">Dropped</SelectItem>
                  <SelectItem value="no_show">No Show</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {enrollForm.status === 'completed' && (
              <>
                <Separator />
                <div className="space-y-1">
                  <Label className="text-xs">Completed Date</Label>
                  <SmartDateInput value={enrollForm.completedDate} onChange={v => euf('completedDate', v)} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Score (0-100)</Label>
                    <Input type="number" min={0} max={100} value={enrollForm.score}
                      onChange={e => euf('score', Number(e.target.value))} onKeyDown={onEnterNext} />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Passed</Label>
                    <Switch checked={enrollForm.passed} onCheckedChange={v => euf('passed', v)} />
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Feedback Rating (1-5)</Label>
                  <Select value={String(enrollForm.feedbackRating || '')} onValueChange={v => euf('feedbackRating', Number(v))}>
                    <SelectTrigger><SelectValue placeholder="Rate" /></SelectTrigger>
                    <SelectContent>
                      {[1, 2, 3, 4, 5].map(n => <SelectItem key={n} value={String(n)}>{'★'.repeat(n)}</SelectItem>)}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Feedback Comment</Label>
                  <Textarea value={enrollForm.feedbackComment} onChange={e => euf('feedbackComment', e.target.value)} rows={2} />
                </div>
              </>
            )}
          </div>
          <SheetFooter>
            <Button onClick={handleEnrollSave} data-primary>Save Enrollment</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Skill Sheet */}
      <Sheet open={skillSheetOpen} onOpenChange={setSkillSheetOpen}>
        <SheetContent className="sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Assess Skill</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-1">
              <Label className="text-xs">Employee *</Label>
              <Select value={skillForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                if (emp) { suf('employeeId', emp.id); suf('employeeCode', emp.empCode); suf('employeeName', emp.displayName); }
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.empCode} — {emp.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Skill Category *</Label>
              <Select value={skillForm.skillCategory} onValueChange={v => { suf('skillCategory', v); suf('skillName', ''); }}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SKILL_CATEGORIES.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Skill Name *</Label>
              <Select value={skillForm.skillName} onValueChange={v => suf('skillName', v)}>
                <SelectTrigger><SelectValue placeholder="Select skill" /></SelectTrigger>
                <SelectContent>
                  {SKILL_CATALOG.filter(s => s.category === skillForm.skillCategory).map(s =>
                    <SelectItem key={s.skill} value={s.skill}>{s.skill}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Current Level *</Label>
                <Select value={String(skillForm.currentLevel)} onValueChange={v => suf('currentLevel', Number(v) as ProficiencyLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {([0, 1, 2, 3, 4] as ProficiencyLevel[]).map(l =>
                      <SelectItem key={l} value={String(l)}>{l} — {PROFICIENCY_LABELS[l]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Target Level</Label>
                <Select value={String(skillForm.targetLevel)} onValueChange={v => suf('targetLevel', Number(v) as ProficiencyLevel)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {([0, 1, 2, 3, 4] as ProficiencyLevel[]).map(l =>
                      <SelectItem key={l} value={String(l)}>{l} — {PROFICIENCY_LABELS[l]}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assessed By</Label>
              <Input value={skillForm.assessedBy} onChange={e => suf('assessedBy', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Assessed Date</Label>
              <SmartDateInput value={skillForm.assessedDate} onChange={v => suf('assessedDate', v)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={skillForm.notes} onChange={e => suf('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleSkillSave} data-primary>Save Skill</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Certification Sheet */}
      <Sheet open={certSheetOpen} onOpenChange={setCertSheetOpen}>
        <SheetContent className="sm:max-w-lg overflow-y-auto">
          <SheetHeader><SheetTitle>{certEditId ? 'Edit Certification' : 'Add Certification'}</SheetTitle></SheetHeader>
          <div className="space-y-4 py-4" data-keyboard-form>
            <div className="space-y-1">
              <Label className="text-xs">Employee *</Label>
              <Select value={certForm.employeeId} onValueChange={v => {
                const emp = activeEmployees.find(e => e.id === v);
                if (emp) { certUf('employeeId', emp.id); certUf('employeeCode', emp.empCode); certUf('employeeName', emp.displayName); }
              }}>
                <SelectTrigger><SelectValue placeholder="Select employee" /></SelectTrigger>
                <SelectContent>
                  {activeEmployees.map(emp => <SelectItem key={emp.id} value={emp.id}>{emp.empCode} — {emp.displayName}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Certification Name *</Label>
              <Input value={certForm.certificationName} onChange={e => certUf('certificationName', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Issuing Body *</Label>
              <Input value={certForm.issuingBody} onChange={e => certUf('issuingBody', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Certificate Number</Label>
              <Input value={certForm.certNumber} onChange={e => certUf('certNumber', e.target.value)} onKeyDown={onEnterNext} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Issue Date *</Label>
                <SmartDateInput value={certForm.issueDate} onChange={v => certUf('issueDate', v)} />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Expiry Date</Label>
                <SmartDateInput value={certForm.expiryDate} onChange={v => certUf('expiryDate', v)} />
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Label className="text-xs">Renewable?</Label>
              <Switch checked={certForm.isRenewable} onCheckedChange={v => certUf('isRenewable', v)} />
            </div>
            {certForm.isRenewable && (
              <div className="space-y-1">
                <Label className="text-xs">Renewal Reminder (days)</Label>
                <Input type="number" value={certForm.renewalReminderDays}
                  onChange={e => certUf('renewalReminderDays', Number(e.target.value))} onKeyDown={onEnterNext} />
                <p className="text-[10px] text-muted-foreground">Alert will show when expiry is within this many days</p>
              </div>
            )}
            <div className="space-y-1">
              <Label className="text-xs">File Reference</Label>
              <Input value={certForm.fileRef} onChange={e => certUf('fileRef', e.target.value)}
                onKeyDown={onEnterNext} placeholder="filename/ref — upload Phase 2" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea value={certForm.notes} onChange={e => certUf('notes', e.target.value)} rows={2} />
            </div>
          </div>
          <SheetFooter>
            <Button onClick={handleCertSave} data-primary>Save Certification</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export default function LearningAndDevelopment() {
  return (
    <SidebarProvider defaultOpen={false}>
      <div className="min-h-screen bg-background flex flex-col">
        <ERPHeader breadcrumbs={[{ label: 'Operix Core', href: '/erp/dashboard' }, { label: 'Pay Hub' }, { label: 'L&D' }]} showDatePicker={false} showCompany={false} />
        <div className="flex-1 overflow-auto p-6">
          <LearningAndDevelopmentPanel />
        </div>
      </div>
    </SidebarProvider>
  );
}
