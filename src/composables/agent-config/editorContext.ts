// Injection keys shared by the editing workspace (useConfigWorkspace) and the components
// that edit the draft: inline Effective-view editors, the Policies view, bundle operations.

import type { ComputedRef, InjectionKey, Ref } from 'vue';
import type {
  AgentConfigRevision,
  AgentInstanceDetail,
  AgentInstanceSummary,
  ConfigDoc,
  ConfigPreview,
  PolicyError,
} from '@/types/agent-config';
import type { OverlayDraft } from './useOverlayDraft';

export type EditorMode = 'full' | 'policy-only';

export interface EditorPermissions {
  mode: ComputedRef<EditorMode>;
}

export interface EditorContext {
  agentId: Ref<string>;
  config: Ref<AgentConfigRevision>;
  instances: Ref<AgentInstanceSummary[]>;
  instanceDetails: Ref<Map<string, AgentInstanceDetail>>;
  /** The instance whose base supplies placeholders (the selected instance when loaded). */
  placeholderInstanceId: Ref<string | null>;
  placeholderBase: ComputedRef<ConfigDoc | null>;
  /** All known bases (reported instances with a detail). */
  bases: ComputedRef<ConfigDoc[]>;
  /** The bases a save is validated against (API ValidationBases); optional for callers. */
  validationBases?: ComputedRef<ConfigDoc[]>;
  lastPreview: Ref<ConfigPreview | null>;
  /** Policy errors from the last failed save (422), for Rego diagnostics. */
  savePolicyErrors: Ref<PolicyError[]>;
}

export const OVERLAY_DRAFT_KEY: InjectionKey<OverlayDraft> =
  Symbol('agent-config-draft');
export const EDITOR_PERMISSIONS_KEY: InjectionKey<EditorPermissions> = Symbol(
  'agent-config-editor-permissions',
);
export const EDITOR_CONTEXT_KEY: InjectionKey<EditorContext> = Symbol(
  'agent-config-editor-context',
);
