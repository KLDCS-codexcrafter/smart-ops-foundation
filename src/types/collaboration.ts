/** collaboration.ts — Sprint 15 Employee Experience types */

export type ExperienceTab = 'directory' | 'inbox' | 'collaboration' | 'total-rewards';

// ── Announcement (HR broadcasts) ─────────────────────────────────
export type AnnouncementPriority = 'normal' | 'important' | 'urgent';
export type AnnouncementAudience = 'all' | 'department' | 'grade' | 'location';

export interface Announcement {
  id: string;
  title: string;
  body: string;
  priority: AnnouncementPriority;
  audience: AnnouncementAudience;
  audienceValue: string;   // dept name / grade code / location — empty for "all"
  postedBy: string;
  pinned: boolean;
  expiryDate: string;      // YYYY-MM-DD — empty = never expires
  readBy: string[];        // employeeId[] who have marked as read
  attachmentRef: string;
  created_at: string;
  updated_at: string;
}

export const PRIORITY_COLORS: Record<AnnouncementPriority, string> = {
  normal:    'bg-slate-500/10 text-slate-600 border-slate-400/30',
  important: 'bg-amber-500/10 text-amber-700 border-amber-500/30',
  urgent:    'bg-red-500/10 text-red-700 border-red-500/30',
};

// ── Recognition (peer / manager kudos) ───────────────────────────
export type RecognitionType = 'kudos' | 'shoutout' | 'milestone' | 'award';

export const RECOGNITION_TYPE_LABELS: Record<RecognitionType, string> = {
  kudos:     'Kudos',
  shoutout:  'Shout-Out',
  milestone: 'Milestone',
  award:     'Award',
};

export const RECOGNITION_ICONS: Record<RecognitionType, string> = {
  kudos: '👏', shoutout: '📣', milestone: '🏆', award: '⭐',
};

export interface Recognition {
  id: string;
  type: RecognitionType;
  fromEmployeeId: string;
  fromEmployeeName: string;
  toEmployeeId: string;
  toEmployeeName: string;
  message: string;
  isPublic: boolean;      // shows on team wall if true
  likedBy: string[];      // employeeId[] who liked
  created_at: string;
  updated_at: string;
}

/** @deprecated Use announcementsKey(entityCode) — Sprint T-Phase-1.2.5h-b2 (kept for backward-compat read fallback) */
export const ANNOUNCEMENTS_KEY = 'erp_announcements';
/** @deprecated Use recognitionsKey(entityCode) — Sprint T-Phase-1.2.5h-b2 */
export const RECOGNITIONS_KEY  = 'erp_recognitions';

// ── Sprint T-Phase-1.2.5h-b2 · Multi-tenant key migration (Bucket C tail) ────
// [JWT] GET /api/peoplepay/announcements?entityCode={e}
export const announcementsKey = (e: string): string =>
  e ? `erp_announcements_${e}` : 'erp_announcements';
// [JWT] GET /api/peoplepay/recognitions?entityCode={e}
export const recognitionsKey = (e: string): string =>
  e ? `erp_recognitions_${e}` : 'erp_recognitions';
