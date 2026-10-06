// Where an effective value comes from (design §6.1): the agent's local file, the overlay, or
// the overlay overriding / removing a file value. Computed client-side from an instance's
// base and the overlay of the revision that instance runs (U1.4).

import {
  getAt,
  hasAt,
  parsePointer,
  formatPointer,
  pointer,
} from './json-pointer';
import { isPlainObject } from './merge-patch';

export type Provenance =
  | 'file'
  | 'overlay'
  | 'overrides-file'
  | 'removed-by-overlay';

/**
 * What the overlay does at `ptr` under RFC 7396. Walking down from the root, a null is a
 * deletion and an object merges, but an array or scalar replaces the whole subtree: below it,
 * nulls are data, not deletions, and a pointer is there only if the replacement has it.
 */
function overlayEffect(
  overlay: unknown,
  ptr: string,
): 'none' | 'deleted' | 'set' | 'replaced-without' {
  const tokens = parsePointer(ptr);
  for (let i = 1; i <= tokens.length; i++) {
    const p = formatPointer(tokens.slice(0, i));
    if (!hasAt(overlay, p)) return 'none';
    const v = getAt(overlay, p);
    if (v === null) return 'deleted';
    if (i < tokens.length && !isPlainObject(v)) {
      return hasAt(overlay, ptr) ? 'set' : 'replaced-without';
    }
  }
  return 'set';
}

export function provenanceOf(
  ptr: string,
  base: unknown,
  overlay: unknown,
): Provenance {
  // A null file value is still a member of the file.
  const inBase = hasAt(base, ptr);
  switch (overlayEffect(overlay, ptr)) {
    case 'deleted':
    case 'replaced-without':
      return inBase ? 'removed-by-overlay' : 'file';
    case 'set':
      return inBase ? 'overrides-file' : 'overlay';
    default:
      return 'file';
  }
}

export function pluginProvenance(
  name: string,
  base: unknown,
  overlay: unknown,
): Provenance {
  return provenanceOf(pointer('plugins', name), base, overlay);
}

export const PROVENANCE_LABELS: Record<Provenance, string> = {
  file: 'file',
  overlay: 'overlay',
  'overrides-file': 'overlay (overrides file)',
  'removed-by-overlay': 'removed by overlay',
};
