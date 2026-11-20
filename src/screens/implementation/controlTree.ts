import { inject, provide, type InjectionKey } from 'vue';
import type { RouteLocationRaw } from 'vue-router';
import type { ImplementedRequirement, SystemComponent } from '@/oscal';
import type { Dashboard } from '@/stores/filters';

/**
 * What the Implementation screen tells each control row, provided once rather than passed to
 * every row.
 */
export interface ControlTreeContext {
  sspId: () => string;
  suggestionsEnabled: () => boolean;
  implementation: (controlId: string) => ImplementedRequirement | undefined;
  /** One of the plan's components, by UUID. */
  component: (uuid: string) => SystemComponent | undefined;
  /** All of the plan's components. */
  components: () => SystemComponent[];
  /** Fetches the plan's components again, e.g. after one was made in another tab. */
  refreshComponents: () => void;
  /** Configure System → Components, with its new-component form open. */
  newComponentLink: () => RouteLocationRaw;
  /** Why the user can't change the implementation, if they can't. */
  editDenied: () => string | undefined;
  /** Reloads the implementation after a change. */
  reload: () => Promise<void>;
  /** The control in the catalog its profile takes it from, if known. */
  catalogLink: (controlId: string) => RouteLocationRaw | undefined;
  /** The evidence filters that check a control. */
  filters: (controlId: string) => Dashboard[];
  byComponentCount: (controlId: string) => number;
  riskCount: (controlId: string) => number;
  riskSeverity: (controlId: string) => 'high' | 'medium' | 'low' | undefined;
  suggestionCount: (controlId: string) => number;
  /** Opens the control's view. */
  controlLink: (controlId: string) => RouteLocationRaw;
  risksLink: (controlId: string) => unknown;
}

const key: InjectionKey<ControlTreeContext> = Symbol('control-tree');

export function provideControlTree(context: ControlTreeContext): void {
  provide(key, context);
}

export function useControlTree(): ControlTreeContext {
  const context = inject(key);
  if (!context) throw new Error('useControlTree needs ImplementationScreen');
  return context;
}
