/**
 * voice-to-order-engine.ts — Web Speech API wrapper + fuzzy SKU match
 * Sprint 11a. Stub-level implementation. Works offline in browsers that
 * support SpeechRecognition. Phase-2 can swap to backend Google STT.
 *
 * NO external dependencies. Uses browser's built-in Web Speech API.
 * [JWT] Future: POST /api/speech/transcribe for non-Chrome fallback.
 */

import type { InventoryItem } from '@/types/inventory-item';

export interface VoiceOrderLine {
  item_id: string | null;          // null if no match above threshold
  item_name_matched: string | null;
  raw_quantity_phrase: string;     // '50 boxes' / 'dus peti'
  quantity: number;
  confidence: number;              // 0..1
  raw_text: string;
}

export interface VoiceOrderResult {
  transcript: string;              // full raw transcript
  lines: VoiceOrderLine[];
  unmatched_phrases: string[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */

/** Browser capability check. Safari lacks Web Speech; return false. */
export function isSpeechRecognitionSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const w = window as any;
  return 'SpeechRecognition' in w || 'webkitSpeechRecognition' in w;
}

/** Start a recognition session. Returns a Promise<transcript>. */
export function transcribeVoice(lang: string = 'en-IN'): Promise<string> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Voice not supported in this environment'));
      return;
    }
    const w = window as any;
    const SR = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!SR) {
      reject(new Error('Voice not supported on this browser'));
      return;
    }
    const rec = new SR();
    rec.lang = lang;
    rec.continuous = false;
    rec.interimResults = false;
    rec.maxAlternatives = 1;
    let finalText = '';
    rec.onresult = (event: any) => {
      try {
        finalText = event.results[0][0].transcript ?? '';
      } catch {
        finalText = '';
      }
    };
    rec.onerror = (e: any) => reject(new Error(e?.error || e?.message || 'Voice error'));
    rec.onend = () => resolve(finalText);
    try {
      rec.start();
    } catch (err) {
      reject(err instanceof Error ? err : new Error('Voice start failed'));
    }
  });
}

/** Hindi-ish word-to-number map for very small numbers. */
const HINDI_NUM: Record<string, number> = {
  ek: 1, do: 2, teen: 3, char: 4, paanch: 5, panch: 5, chhe: 6, che: 6,
  saat: 7, aath: 8, nau: 9, dus: 10, das: 10, gyarah: 11, barah: 12,
  pandrah: 15, bees: 20, pachas: 50, sau: 100,
};

const UNIT_WORDS = /\b(boxes?|box|pcs?|pieces?|peti|petis|kg|kgs?|units?|nos?|cartons?|bags?|cases?)\b/gi;

function tryParseNumber(token: string): number | null {
  if (/^\d+$/.test(token)) return parseInt(token, 10);
  const lower = token.toLowerCase();
  if (lower in HINDI_NUM) return HINDI_NUM[lower];
  return null;
}

/** Parse transcript into quantity + item phrases. Simple regex-based. */
export function parseVoiceOrder(
  transcript: string,
  items: InventoryItem[],
): VoiceOrderResult {
  const cleaned = transcript.toLowerCase().replace(/\band\b/g, ',');
  const segments = cleaned.split(/[,;]/).map(s => s.trim()).filter(Boolean);
  const lines: VoiceOrderLine[] = [];
  const unmatched: string[] = [];

  for (const seg of segments) {
    const words = seg.split(/\s+/);
    let qty: number | null = null;
    let qtyPhrase = '';
    for (const w of words) {
      const n = tryParseNumber(w);
      if (n != null) { qty = n; qtyPhrase = w; break; }
    }
    if (qty == null) { unmatched.push(seg); continue; }

    const rest = seg.replace(qtyPhrase, '').replace(UNIT_WORDS, '').trim();
    if (!rest) { unmatched.push(seg); continue; }

    const restCompact = rest.replace(/\s+/g, '');
    const matched = items.find(it => {
      const name = (it.name ?? '').toLowerCase();
      const code = (it.code ?? '').toLowerCase();
      if (!name && !code) return false;
      if (code && code === restCompact) return true;
      if (name && (name.includes(rest) || rest.includes(name.slice(0, 6)))) return true;
      return false;
    });

    if (matched) {
      lines.push({
        item_id: matched.id,
        item_name_matched: matched.name,
        raw_quantity_phrase: `${qty}`,
        quantity: qty,
        confidence: 0.7,
        raw_text: seg,
      });
    } else {
      lines.push({
        item_id: null,
        item_name_matched: null,
        raw_quantity_phrase: `${qty}`,
        quantity: qty,
        confidence: 0,
        raw_text: seg,
      });
      unmatched.push(seg);
    }
  }

  return { transcript, lines, unmatched_phrases: unmatched };
}
