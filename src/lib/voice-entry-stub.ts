/**
 * @file        voice-entry-stub.ts
 * @sprint      T-Phase-1.2.6f-pre-2 · Block I · OOB-17 · SD-14 stub
 * @purpose     Web Speech API voice entry · Chrome-only beta.
 */
export interface VoiceCaptureHandle {
  stop: () => void;
}

interface SpeechRecognitionResultEntry { transcript: string }
interface SpeechRecognitionResultLike { 0: SpeechRecognitionResultEntry; isFinal: boolean }
interface SpeechRecognitionEventLike {
  results: { [index: number]: SpeechRecognitionResultLike; length: number };
  resultIndex: number;
}
interface SpeechRecognitionLike {
  continuous: boolean; interimResults: boolean; lang: string;
  start: () => void; stop: () => void;
  onresult: ((e: SpeechRecognitionEventLike) => void) | null;
  onerror: ((e: unknown) => void) | null;
}

export function isVoiceEntrySupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as unknown as Record<string, unknown>;
  return Boolean(w.SpeechRecognition || w.webkitSpeechRecognition);
}

export function startVoiceCapture(
  onTranscript: (text: string, isFinal: boolean) => void,
  onError: (err: string) => void,
): VoiceCaptureHandle | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as Record<string, unknown>;
  const Ctor = (w.SpeechRecognition ?? w.webkitSpeechRecognition) as
    (new () => SpeechRecognitionLike) | undefined;
  if (!Ctor) { onError('Voice entry not supported in this browser (Chrome-only beta).'); return null; }
  // [JWT] WSS /ws/voice-capture · Phase 2 will replace with server transcription.
  const rec = new Ctor();
  rec.continuous = true; rec.interimResults = true; rec.lang = 'en-IN';
  rec.onresult = (e) => {
    for (let i = e.resultIndex; i < e.results.length; i++) {
      const r = e.results[i];
      onTranscript(r[0].transcript, r.isFinal);
    }
  };
  rec.onerror = () => { onError('Voice capture error'); };
  try { rec.start(); } catch { onError('Could not start voice capture'); return null; }
  return { stop: () => { try { rec.stop(); } catch { /* noop */ } } };
}
