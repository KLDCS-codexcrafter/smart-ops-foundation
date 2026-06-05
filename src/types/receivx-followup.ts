// S148 · ReceivX Collections Follow-Up · Charis TDL spec · APPEND-ONLY (DP-RX-2)
export type FollowUpChannel = 'call' | 'whatsapp' | 'email' | 'sms' | 'meeting' | 'visit';

export interface CollectionFollowUp {
  id: string; entityId: string;
  taskId: string;                    // OutstandingTask ref (existing system)
  partyId: string; partyName: string;
  voucherNo: string;                 // denormalized from task
  followedUpByUserId: string; followedUpByName: string;
  at: string;                        // ISO date+time of the follow-up
  channel: FollowUpChannel;
  contactPersonId?: string | null;   // fd_party_contacts ref
  contactPersonName?: string | null;
  remarks: string;                   // MANDATORY · throw on empty
  nextFollowUpDate?: string | null;  // drives Today board via task.next_action_date
  promisedAmount?: number | null;    // when set → PTP created via EXISTING machinery
  ptpId?: string | null;             // back-ref to the created PTP
  voidedAt?: string | null; voidedByUserId?: string | null; voidReason?: string | null;
  createdAt: string;
}

export const receivxFollowUpsKey = (entityCode: string): string =>
  `rx_followups_${entityCode}`;

export const receivxFollowUpPromptKey = (entityCode: string, dateISO: string): string =>
  `rx_followup_prompt_${entityCode}_${dateISO.slice(0, 10)}`;
