// Per-agent pending-changes drafts for the browser session (R69). The Configuration tab and
// the Policies view are different routes; both bind to the same DraftState here, so edits
// made in one show up (and are saved together) in the other. Kept in memory only: a reload
// starts clean (the pending bar guards it with beforeunload).

import type { AgentConfigRevision } from '@/types/agent-config';
import { clone, deepEqual } from '@/utils/agent-config/merge-patch';
import { createDraftState, type DraftState } from './useOverlayDraft';

const drafts = new Map<string, DraftState>();

/** The agent's draft state, created (uninitialised) on first use. */
export function agentDraftState(agentId: string): DraftState {
  let s = drafts.get(agentId);
  if (!s) {
    s = createDraftState();
    drafts.set(agentId, s);
  }
  return s;
}

/**
 * Adopts the loaded desired revision as the draft's base when the draft has no pending
 * changes (or was never initialised). A draft WITH pending changes keeps its base revision:
 * saving it then meets the 409 flow, which lets the user rebase deliberately.
 */
export function syncDraftState(
  s: DraftState,
  config: AgentConfigRevision,
  force = false,
): void {
  const clean = deepEqual(s.overlay.value, s.original.value);
  const initialised = s.baseRevision.value >= 0;
  if (!force && initialised && !clean) return;
  if (
    !force &&
    initialised &&
    s.baseRevision.value === config.revision &&
    deepEqual(s.original.value, config.overlay ?? {})
  ) {
    return;
  }
  s.baseRevision.value = config.revision;
  s.original.value = clone(config.overlay ?? {});
  s.overlay.value = clone(config.overlay ?? {});
  if (force || !initialised) s.comment.value = '';
}

/** Test hook: forget every draft. */
export function resetAgentDrafts(): void {
  drafts.clear();
}
