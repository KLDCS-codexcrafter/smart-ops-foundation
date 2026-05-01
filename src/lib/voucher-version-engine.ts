/**
 * voucher-version-engine.ts — Edit-as-new-version per CGST Rule 56(8).
 *
 * "Any entry in registers, accounts and documents shall not be erased, effaced
 *  or overwritten" — when a posted record is edited, we DO NOT mutate it. We
 *  create a new version with version = N+1 and superseded_by = newId set on
 *  the original.
 *
 * Sprint T-Phase-1.2.5h-b1
 */

export interface VersionedRecord {
  id: string;
  version: number;
  superseded_by: string | null;
}

/** Returns true if this record can be safely mutated in place (status not posted). */
export function canMutateInPlace(record: { status?: string }): boolean {
  // Drafts, submitted, rejected — mutable. Posted, cancelled — protected.
  const protectedStatuses = ['posted', 'cancelled'];
  return !protectedStatuses.includes(record.status ?? '');
}

/** Build a new version from an existing posted record. Caller persists both. */
export function buildNextVersion<T extends VersionedRecord>(
  original: T,
  patch: Partial<T>,
  newId: string,
): { supersededOriginal: T; nextVersion: T } {
  return {
    supersededOriginal: { ...original, superseded_by: newId },
    nextVersion: {
      ...original,
      ...patch,
      id: newId,
      version: original.version + 1,
      superseded_by: null,
    } as T,
  };
}
