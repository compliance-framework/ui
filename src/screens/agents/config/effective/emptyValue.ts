// The "emptied value" rule shared by the inline editors of string map keys (plugin config
// and labels): emptying a key that any instance's file defines inherits the file value again
// (the overlay drops the key); a key only the overlay adds keeps an empty string (its Remove /
// delete action removes it).
import type { OverlayDraft } from '@/composables/agent-config/useOverlayDraft';
import type { ConfigDoc } from '@/types/agent-config';
import { hasAt } from '@/utils/agent-config/json-pointer';

/** Whether any of `bases` (the instances' files) defines a value at `ptr`. */
export function definedInAnyBase(
  bases: readonly (ConfigDoc | null | undefined)[],
  ptr: string,
): boolean {
  return bases.some((b) => !!b && hasAt(b, ptr));
}

/** Writes `value` at `ptr`, applying the empty-value rule above. */
export function setStringKey(
  draft: Pick<OverlayDraft, 'set' | 'unset'>,
  bases: readonly (ConfigDoc | null | undefined)[],
  ptr: string,
  value: string,
): void {
  if (!value && definedInAnyBase(bases, ptr)) draft.unset(ptr);
  else draft.set(ptr, value);
}
