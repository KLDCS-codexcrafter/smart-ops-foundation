/**
 * @file     entity-branding-engine.ts
 * @purpose  Per-entity branding asset storage (logo · authorized_signature · stamp)
 *           consumed by invoice print template via print-render-helpers.
 * @sprint   Sprint R0 · Block 5.3 · DP-R0-1
 * @who      Operix Engineering (Lovable-generated, Claude-audited, Founder-owned)
 *
 * Storage: localStorage `erp_entity_branding_${entityCode}` — dataURL strings.
 * Hard guards (honesty over magic):
 *   - image MIME only (image/png · image/jpeg · image/jpg · image/webp · image/svg+xml)
 *   - ≤ 200_000 bytes per slot (localStorage realistic budget for 3 slots × N entities)
 *   - reject larger / wrong-type with a clear Error (caller surfaces toast)
 *
 * [JWT] GET/PUT /api/entity/:entityCode/branding/:slot — Phase-2 backend will move
 *       these to object storage; localStorage is the Phase-1 honesty boundary.
 */

export type BrandingSlot = 'logo' | 'authorized_signature' | 'stamp';

export interface EntityBranding {
  logo: string | null;
  authorized_signature: string | null;
  stamp: string | null;
  updatedAt: string;
}

const EMPTY: EntityBranding = {
  logo: null,
  authorized_signature: null,
  stamp: null,
  updatedAt: '1970-01-01T00:00:00.000Z',
};

export const MAX_SLOT_BYTES = 200_000;

const ALLOWED_MIME = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/svg+xml',
]);

export const entityBrandingKey = (entityCode: string): string =>
  `erp_entity_branding_${entityCode}`;

export function loadEntityBranding(entityCode: string): EntityBranding {
  if (!entityCode) return { ...EMPTY };
  try {
    // [JWT] GET /api/entity/:entityCode/branding
    const raw = localStorage.getItem(entityBrandingKey(entityCode));
    if (!raw) return { ...EMPTY };
    const parsed = JSON.parse(raw) as Partial<EntityBranding>;
    return {
      logo: parsed.logo ?? null,
      authorized_signature: parsed.authorized_signature ?? null,
      stamp: parsed.stamp ?? null,
      updatedAt: parsed.updatedAt ?? EMPTY.updatedAt,
    };
  } catch {
    return { ...EMPTY };
  }
}

export function getBrandingSlot(entityCode: string, slot: BrandingSlot): string | null {
  return loadEntityBranding(entityCode)[slot];
}

/**
 * Parse a dataURL and validate MIME + size. Throws Error on rejection.
 * Returns the dataURL unchanged when valid.
 */
export function validateBrandingDataUrl(dataUrl: string): void {
  if (typeof dataUrl !== 'string' || !dataUrl.startsWith('data:')) {
    throw new Error('Invalid image: must be a dataURL.');
  }
  const semi = dataUrl.indexOf(';');
  if (semi < 5) throw new Error('Invalid dataURL header.');
  const mime = dataUrl.slice(5, semi).toLowerCase();
  if (!ALLOWED_MIME.has(mime)) {
    throw new Error(`Unsupported image type: ${mime}. Allowed: PNG, JPEG, WebP, SVG.`);
  }
  // dataURL size is a close-enough proxy for stored bytes.
  if (dataUrl.length > MAX_SLOT_BYTES) {
    throw new Error(
      `Image too large: ${(dataUrl.length / 1024).toFixed(0)} KB · max ${(MAX_SLOT_BYTES / 1024).toFixed(0)} KB per slot.`,
    );
  }
}

export function setBrandingSlot(
  entityCode: string,
  slot: BrandingSlot,
  dataUrl: string,
): EntityBranding {
  if (!entityCode) throw new Error('entityCode is required.');
  validateBrandingDataUrl(dataUrl);
  const current = loadEntityBranding(entityCode);
  const next: EntityBranding = {
    ...current,
    [slot]: dataUrl,
    updatedAt: new Date().toISOString(),
  };
  // [JWT] PUT /api/entity/:entityCode/branding/:slot
  localStorage.setItem(entityBrandingKey(entityCode), JSON.stringify(next));
  return next;
}

export function clearBrandingSlot(entityCode: string, slot: BrandingSlot): EntityBranding {
  if (!entityCode) throw new Error('entityCode is required.');
  const current = loadEntityBranding(entityCode);
  const next: EntityBranding = {
    ...current,
    [slot]: null,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(entityBrandingKey(entityCode), JSON.stringify(next));
  return next;
}

export const BRANDING_SLOT_LABELS: Record<BrandingSlot, string> = {
  logo: 'Company Logo',
  authorized_signature: 'Authorized Signature',
  stamp: 'Company Stamp / Seal',
};

export const BRANDING_SLOT_HINTS: Record<BrandingSlot, string> = {
  logo: 'Header logo on invoices and prints. Transparent PNG recommended.',
  authorized_signature: 'Rendered above the "Authorised Signatory" line in invoices.',
  stamp: 'Rendered alongside the signature block on invoices.',
};
