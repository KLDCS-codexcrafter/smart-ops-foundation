/**
 * @file        src/test/happy-code-channels.test.ts
 * @purpose     C.1d · HappyCode Channel 2 (JWT email) + Channel 3 (verbal inline) capture
 * @sprint      T-Phase-1.C.1d · Block H.2
 * @iso         Reliability + Security (token expiry)
 */
import { describe, it, expect, beforeEach } from 'vitest';
import {
  captureHappyCodeFeedback,
  triggerChannel2EmailRequest,
  verifyChannel2JWT,
  submitChannel2Feedback,
  captureChannel3VerbalFeedback,
  listHappyCodeFeedback,
  getHappyCodeFeedback,
} from '@/lib/servicedesk-engine';

const ENTITY = 'OPRX';

function seedFeedback() {
  return captureHappyCodeFeedback({
    entity_id: ENTITY,
    ticket_id: 'st-001',
    customer_id: 'CUST-1',
    source: 'otp_channel',
    otp_verified: true,
    otp_verified_at: new Date().toISOString(),
    email_nps_score: null,
    email_response_at: null,
    verbal_nps_score: null,
    verbal_happiness_score: null,
    verbal_captured_at: null,
    verbal_captured_by: null,
    notes: '',
  });
}

describe('HappyCode Channel 2 · email JWT NPS', () => {
  beforeEach(() => localStorage.clear());

  it('triggerChannel2EmailRequest returns valid JWT that verifies', () => {
    const fb = seedFeedback();
    const { token, expires_at } = triggerChannel2EmailRequest(fb.id, ENTITY);
    expect(token.length).toBeGreaterThan(0);
    expect(new Date(expires_at).getTime()).toBeGreaterThan(Date.now());

    const verified = verifyChannel2JWT(token);
    expect('feedback_id' in verified).toBe(true);
    if ('feedback_id' in verified) expect(verified.feedback_id).toBe(fb.id);
  });

  it('invalid token returns error', () => {
    const r = verifyChannel2JWT('not-a-real-token');
    expect('error' in r).toBe(true);
  });

  it('submitChannel2Feedback persists nps + comment', () => {
    const fb = seedFeedback();
    const { token } = triggerChannel2EmailRequest(fb.id, ENTITY);
    submitChannel2Feedback(token, 9, 'Great job', ENTITY);
    const after = getHappyCodeFeedback(fb.id, ENTITY);
    expect(after?.channel_2_nps_score).toBe(9);
    expect(after?.channel_2_comment).toBe('Great job');
    expect(after?.channel_2_responded_at).toBeTruthy();
  });
});

describe('HappyCode Channel 3 · verbal inline capture', () => {
  beforeEach(() => localStorage.clear());

  it('captureChannel3VerbalFeedback records NPS + happiness + engineer id', () => {
    const fb = seedFeedback();
    captureChannel3VerbalFeedback(fb.id, 'ENG-7', 8, 9, 'Customer happy with quick fix', ENTITY);
    const after = getHappyCodeFeedback(fb.id, ENTITY);
    expect(after?.channel_3_nps_score).toBe(8);
    expect(after?.channel_3_happiness_score).toBe(9);
    expect(after?.channel_3_captured_by_engineer_id).toBe('ENG-7');
    expect(after?.channel_3_captured_at).toBeTruthy();
  });

  it('listHappyCodeFeedback filters by ticket_id', () => {
    seedFeedback();
    captureHappyCodeFeedback({
      entity_id: ENTITY, ticket_id: 'st-OTHER', customer_id: 'C2', source: 'otp_channel',
      otp_verified: true, otp_verified_at: new Date().toISOString(),
      email_nps_score: null, email_response_at: null,
      verbal_nps_score: null, verbal_happiness_score: null, verbal_captured_at: null, verbal_captured_by: null,
      notes: '',
    });
    expect(listHappyCodeFeedback({ ticket_id: 'st-001' }).length).toBe(1);
    expect(listHappyCodeFeedback().length).toBe(2);
  });
});
