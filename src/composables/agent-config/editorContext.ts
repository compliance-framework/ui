// Injection keys shared by the editing workspace (useConfigWorkspace) and the components
// that edit the draft (the inline Effective-view editors).

import type { ComputedRef, InjectionKey, Ref } from 'vue';
import type {
  AgentConfigRevision,
  AgentInstanceDetail,
  AgentInstanceSummary,
  ConfigDoc,
  ConfigPreview,
} from '@/types/agent-config';
import type { FieldAccess } from '@/utils/agent-config/field-access';
import type { OverlayDraft } from './useOverlayDraft';

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
  lastPreview: Ref<ConfigPreview | null>;
  /** The last preview while it still describes the draft, else null (shields, trust hints). */
  currentPreview: ComputedRef<ConfigPreview | null>;
  /** R71 three-state access of the field at a pointer (utils/agent-config/field-access). */
  accessAt: (ptr: string) => FieldAccess;
}

export const OVERLAY_DRAFT_KEY: InjectionKey<OverlayDraft> =
  Symbol('agent-config-draft');
export const EDITOR_CONTEXT_KEY: InjectionKey<EditorContext> = Symbol(
  'agent-config-editor-context',
);
