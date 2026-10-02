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

export type Provenance =
  | 'file'
  | 'overlay'
  | 'overrides-file'
  | 'removed-by-overlay';

/** True when the overlay nulls `ptr` or one of its ancestors. */
function nulledByOverlay(overlay: unknown, ptr: string): boolean {
  const tokens = parsePointer(ptr);
  for (let i = 1; i <= tokens.length; i++) {
    const p = formatPointer(tokens.slice(0, i));
    if (hasAt(overlay, p) && getAt(overlay, p) === null) return true;
  }
  return false;
}

export function provenanceOf(
  ptr: string,
  base: unknown,
  overlay: unknown,
): Provenance {
  const inBase = hasAt(base, ptr) && getAt(base, ptr) !== null;
  if (nulledByOverlay(overlay, ptr)) {
    return inBase ? 'removed-by-overlay' : 'file';
  }
  if (hasAt(overlay, ptr)) {
    return inBase ? 'overrides-file' : 'overlay';
  }
  return 'file';
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
