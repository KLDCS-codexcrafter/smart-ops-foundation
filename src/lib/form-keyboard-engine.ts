/**
 * form-keyboard-engine · Sprint T-Phase-2.7-d-2 · Q1-a + Q2-β-EXPANDED
 *
 * Universal ERP keyboard navigation built on:
 *   - W3C ARIA standards (Tab/Shift+Tab/Enter/Esc/Arrow keys)
 *   - HTML5 (textarea Enter = newline)
 *   - MS Office 1989+ (Ctrl+S/N/P/F/Z/Y/D/H)
 *   - IBM PC 1981+ (F1=help, F2=edit)
 *   - Excel 1985+ (F2=edit cell, F4=picker, +/-/*/=/% inline math)
 *
 * NO Tally trademark or trade-dress copying · all bindings sourced from
 * pre-existing public standards (per Lotus v. Borland 1995 + Oracle v.
 * Google 2021 · methods of operation are not copyrightable).
 *
 * Pure event-handler library · zero React deps · independently testable.
 */

export type ShortcutAction =
  | 'save_draft' | 'save_post' | 'save_and_new'
  | 'edit_cell' | 'open_picker' | 'help'
  | 'find_in_voucher' | 'find_replace'
  | 'undo' | 'redo'
  | 'duplicate_line' | 'delete_line'
  | 'insert_line' | 'move_line_up' | 'move_line_down'
  | 'merge_with_above'
  | 'goto_line'
  | 'cancel_or_close';

export interface ShortcutBinding {
  combo: string;
  action: ShortcutAction;
  description: string;
  source: string;
  /** When true · binding fires even inside textarea. When false · skipped if focus in textarea. */
  fireInTextarea?: boolean;
}

export const UNIVERSAL_FORM_BINDINGS: ShortcutBinding[] = [
  // Voucher commands
  { combo: 'Ctrl+S',        action: 'save_draft',         description: 'Save draft',                source: 'MS Office 1989',  fireInTextarea: true },
  { combo: 'Ctrl+Shift+S',  action: 'save_post',          description: 'Save and post',             source: 'MS Office',       fireInTextarea: true },
  { combo: 'Ctrl+Enter',    action: 'save_and_new',       description: 'Save and new (carryover)',  source: 'Gmail/Outlook',   fireInTextarea: false },
  // Cell-level
  { combo: 'F2',            action: 'edit_cell',          description: 'Edit current cell',         source: 'Excel 1985',      fireInTextarea: false },
  { combo: 'F4',            action: 'open_picker',        description: 'Open dropdown/picker',      source: 'Excel 1985',      fireInTextarea: false },
  { combo: 'Alt+ArrowDown', action: 'open_picker',        description: 'Open dropdown (alt)',       source: 'HTML5',           fireInTextarea: false },
  // Search
  { combo: 'Ctrl+F',        action: 'find_in_voucher',    description: 'Find in line items',        source: 'MS Office 1989',  fireInTextarea: true },
  { combo: 'Ctrl+H',        action: 'find_replace',       description: 'Find and replace',          source: 'MS Office 1989',  fireInTextarea: true },
  // History
  { combo: 'Ctrl+Z',        action: 'undo',               description: 'Undo',                      source: 'MS Office 1989',  fireInTextarea: true },
  { combo: 'Ctrl+Y',        action: 'redo',               description: 'Redo',                      source: 'MS Office 1989',  fireInTextarea: true },
  // Grid operations
  { combo: 'Alt+I',         action: 'insert_line',        description: 'Insert line at cursor',     source: 'Marg ERP / Notion', fireInTextarea: false },
  { combo: 'Alt+D',         action: 'delete_line',        description: 'Delete current line',       source: 'MS Office (Alt+letter universal)', fireInTextarea: false },
  { combo: 'Alt+C',         action: 'duplicate_line',     description: 'Duplicate current line',    source: 'Notion / Excel pattern', fireInTextarea: false },
  { combo: 'Alt+M',         action: 'merge_with_above',   description: 'Merge with line above',     source: 'SAP convention',  fireInTextarea: false },
  { combo: 'Ctrl+ArrowUp',  action: 'move_line_up',       description: 'Move line up',              source: 'Excel 2007 / Notion', fireInTextarea: false },
  { combo: 'Ctrl+ArrowDown',action: 'move_line_down',     description: 'Move line down',            source: 'Excel 2007 / Notion', fireInTextarea: false },
  // Navigation
  { combo: 'Ctrl+G',        action: 'goto_line',          description: 'Go to line by number',      source: 'VS Code / IDEs',  fireInTextarea: false },
  // Help
  { combo: 'F1',            action: 'help',               description: 'Show keyboard shortcuts',   source: 'IBM PC 1981',     fireInTextarea: true },
  { combo: 'Ctrl+/',        action: 'help',               description: 'Show shortcuts (alt)',      source: 'VS Code',         fireInTextarea: true },
  // Safety
  { combo: 'Escape',        action: 'cancel_or_close',    description: 'Cancel/close (with dirty confirm)', source: 'W3C ARIA', fireInTextarea: true },
];

export interface MatchedShortcut {
  binding: ShortcutBinding;
  preventDefault: boolean;
}

export interface ComboParts {
  ctrl: boolean;
  shift: boolean;
  alt: boolean;
  meta: boolean;
  key: string;
}

/** Parse combo string · supports Ctrl/Shift/Alt/Meta + key. */
export function comboToParts(combo: string): ComboParts {
  const parts = combo.split('+').map((p) => p.trim());
  const out: ComboParts = { ctrl: false, shift: false, alt: false, meta: false, key: '' };
  for (const p of parts) {
    const lp = p.toLowerCase();
    if (lp === 'ctrl' || lp === 'control') out.ctrl = true;
    else if (lp === 'shift') out.shift = true;
    else if (lp === 'alt' || lp === 'option') out.alt = true;
    else if (lp === 'meta' || lp === 'cmd' || lp === 'command') out.meta = true;
    else out.key = p;
  }
  return out;
}

function normalizeKey(k: string): string {
  return k.length === 1 ? k.toLowerCase() : k;
}

/** Match a KeyboardEvent against bindings · respects fireInTextarea flag. */
export function matchFormShortcut(
  e: KeyboardEvent,
  bindings: ShortcutBinding[] = UNIVERSAL_FORM_BINDINGS,
): MatchedShortcut | null {
  const target = e.target as HTMLElement | null;
  const inTextarea = !!target && target.tagName === 'TEXTAREA';

  for (const b of bindings) {
    const parts = comboToParts(b.combo);
    if (parts.ctrl !== e.ctrlKey) continue;
    if (parts.shift !== e.shiftKey) continue;
    if (parts.alt !== e.altKey) continue;
    if (parts.meta !== e.metaKey) continue;
    if (normalizeKey(parts.key) !== normalizeKey(e.key)) continue;
    if (inTextarea && b.fireInTextarea === false) return null;
    return { binding: b, preventDefault: true };
  }
  return null;
}

/* ---------------- Inline formula evaluator (no eval) ---------------- */

interface ParserState {
  src: string;
  pos: number;
}

function skipWs(s: ParserState): void {
  while (s.pos < s.src.length && /\s/.test(s.src[s.pos])) s.pos++;
}

function parseNumberOrIdent(s: ParserState, ctx?: Record<string, number>): number | null {
  skipWs(s);
  // number
  const numMatch = /^[0-9]+(\.[0-9]+)?/.exec(s.src.slice(s.pos));
  if (numMatch) {
    s.pos += numMatch[0].length;
    return parseFloat(numMatch[0]);
  }
  // identifier
  const idMatch = /^[a-zA-Z_][a-zA-Z0-9_]*/.exec(s.src.slice(s.pos));
  if (idMatch) {
    s.pos += idMatch[0].length;
    if (ctx && Object.prototype.hasOwnProperty.call(ctx, idMatch[0])) {
      return ctx[idMatch[0]];
    }
    return null;
  }
  // parenthesized
  if (s.src[s.pos] === '(') {
    s.pos++;
    const v = parseExpr(s, ctx);
    skipWs(s);
    if (s.src[s.pos] === ')') { s.pos++; return v; }
    return null;
  }
  // unary minus
  if (s.src[s.pos] === '-') {
    s.pos++;
    const v = parseNumberOrIdent(s, ctx);
    return v === null ? null : -v;
  }
  return null;
}

function parsePostfix(s: ParserState, ctx?: Record<string, number>): number | null {
  let v = parseNumberOrIdent(s, ctx);
  if (v === null) return null;
  skipWs(s);
  while (s.src[s.pos] === '%') {
    s.pos++;
    v = v / 100;
    skipWs(s);
  }
  return v;
}

function parseTerm(s: ParserState, ctx?: Record<string, number>): number | null {
  let left = parsePostfix(s, ctx);
  if (left === null) return null;
  skipWs(s);
  while (s.src[s.pos] === '*' || s.src[s.pos] === '/') {
    const op = s.src[s.pos++];
    const right = parsePostfix(s, ctx);
    if (right === null) return null;
    left = op === '*' ? left * right : left / right;
    skipWs(s);
  }
  return left;
}

function parseExpr(s: ParserState, ctx?: Record<string, number>): number | null {
  let left = parseTerm(s, ctx);
  if (left === null) return null;
  skipWs(s);
  while (s.src[s.pos] === '+' || s.src[s.pos] === '-') {
    const op = s.src[s.pos++];
    const right = parseTerm(s, ctx);
    if (right === null) return null;
    left = op === '+' ? left + right : left - right;
    skipWs(s);
  }
  return left;
}

/**
 * Currency-input formula evaluator · '=qty*rate' · '*' / '/' / '+' / '-' / '%' inline.
 * Custom recursive-descent parser · NO eval(). Returns null on parse error.
 */
export function evaluateInlineFormula(
  input: string,
  contextValues?: Record<string, number>,
): number | null {
  if (typeof input !== 'string') return null;
  let src = input.trim();
  if (!src) return null;
  if (src.startsWith('=')) src = src.slice(1).trim();
  if (!src) return null;
  // Quick reject: must contain digits, identifier, or operator
  if (!/[0-9a-zA-Z]/.test(src)) return null;

  const state: ParserState = { src, pos: 0 };
  const result = parseExpr(state, contextValues);
  skipWs(state);
  if (result === null) return null;
  if (state.pos !== state.src.length) return null;
  if (!Number.isFinite(result)) return null;
  // Round to 2 decimals (currency)
  return Math.round(result * 100) / 100;
}
