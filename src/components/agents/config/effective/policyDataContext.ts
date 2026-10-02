// What the structured policy_data tree needs from its owner (PolicyDataSection): per-pointer
// edit rights and access notes, pending markers, and the edits themselves. Without a provider
// (read-only contexts) the tree only displays.

import type { InjectionKey } from 'vue';

export interface PolicyDataTreeContext {
  /** Whether the value at `ptr` may be edited (agent:configure and R71 access). */
  canEdit(ptr: string): boolean;
  /** R71 note for `ptr` when it differs from the section's own state ('' otherwise). */
  accessNote(
    ptr: string,
  ): { state: 'restricted' | 'readonly'; text: string } | null;
  /** The draft changes exactly this pointer (an element of a list included). */
  changed(ptr: string): boolean;
  /** Undo the pending change at `ptr`. */
  revert(ptr: string): void;
  /** Set the effective value at `ptr` (arrays are passed whole). */
  set(ptr: string, value: unknown): void;
  /** Remove the key at `ptr`. */
  remove(ptr: string): void;
}

export const POLICY_DATA_TREE_KEY: InjectionKey<PolicyDataTreeContext> =
  Symbol('policy-data-tree');
