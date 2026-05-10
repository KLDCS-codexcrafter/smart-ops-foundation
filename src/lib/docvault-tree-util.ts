/**
 * @file        src/lib/docvault-tree-util.ts
 * @purpose     Drawing register version-tree utility · pure function helpers · no React
 * @who         All consumers of D-NEW-CL canonical version-tree pattern
 * @when        2026-05-09 (T1 · F-2 fix)
 * @sprint      T-Phase-1.A.9.T1 · Q-LOCK-T1-F2 · Block B
 * @iso         ISO 9001:2015 §7.5 (document control · drawing revision history)
 * @whom        Audit Owner · Engineering Manager
 * @decisions   D-NEW-CL-docvault-version-tree-pattern (CANONICAL · 11th at v14) ·
 *              D-NEW-CJ-docvault-file-metadata-schema (consumes DocumentVersion type) ·
 *              FR-21 (no eslint-disable · pure helpers in dedicated util file)
 * @disciplines FR-30 (this header) · FR-21 (no eslint-disable comments)
 * @reuses      DocumentVersion type from @/types/docvault
 * @[JWT]       N/A · pure client-side utility · Phase 2 may add backend tree builder
 */
import type { DocumentVersion } from '@/types/docvault';

export interface VersionNode {
  version: DocumentVersion;
  children: VersionNode[];
}

export function buildVersionTree(versions: DocumentVersion[]): VersionNode[] {
  const map = new Map<string, VersionNode>();
  for (const v of versions) {
    map.set(v.version_no, { version: v, children: [] });
  }
  const roots: VersionNode[] = [];
  for (const v of versions) {
    const node = map.get(v.version_no)!;
    if (v.supersedes_version && map.has(v.supersedes_version)) {
      map.get(v.supersedes_version)!.children.push(node);
    } else {
      roots.push(node);
    }
  }
  return roots;
}
