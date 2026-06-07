/**
 * @file        src/types/my-reminder.ts
 * @sprint      Sprint B1S2 · T-B1S2-Adapters-MyReminders · Pillar B.1 CLOSE
 * @purpose     Per-user, self-served reminder type — distinct from the older
 *              TaskReminder (S138 governance · task-level, configured by admins).
 *              MyReminder is for the operator to nudge themselves about anything
 *              (a record, an approval mirror task, or a free-text note).
 * @[JWT]       Wave-2: server-side scheduler. Today client-side polling only.
 */

export type MyReminderKind =
  | 'approval'        // ref points to an approval mirror task id
  | 'task'            // ref points to a TaskFlow Task id
  | 'voucher'         // ref points to a voucher id (FinCore/Procure/etc)
  | 'party'           // ref points to a party master id
  | 'free';           // freeform · no anchor

export type MyReminderStatus = 'pending' | 'fired' | 'snoozed' | 'dismissed';

export interface MyReminder {
  id: string;
  entity_id: string;
  user_name: string;       // free-text until Wave-2 auth subject id
  kind: MyReminderKind;
  ref_id?: string;         // optional anchor (approval task id, etc.)
  ref_label?: string;
  deep_link?: string;      // hash route to jump back to the anchor
  title: string;
  note?: string;
  remind_at: string;       // ISO · the trigger time (IST UI render)
  status: MyReminderStatus;
  snoozed_until?: string;
  fired_at?: string;
  dismissed_at?: string;
  created_at: string;
  updated_at: string;
}

export const myRemindersKey = (entityCode: string): string =>
  `erp_my_reminders_${entityCode}`;
