import { inject, provide, type InjectionKey } from 'vue';
import type { ImplementedRequirement, SystemComponent } from '@/oscal';
import type { Dashboard } from '@/stores/filters';

/** A control row's boxes, in order: the control, how it is implemented, the evidence that checks it. */
export const LINK_COLUMNS = [
  { key: 'control', label: 'Control' },
  { key: 'implementation', label: 'Implementation' },
  { key: 'evidence', label: 'Evidence' },
];

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
  /** The evidence filters that check a control. */
  filters: (controlId: string) => Dashboard[];
  byComponentCount: (controlId: string) => number;
  riskCount: (controlId: string) => number;
  riskSeverity: (controlId: string) => 'high' | 'medium' | 'low' | undefined;
  suggestionCount: (controlId: string) => number;
  highlighted: (controlId: string) => boolean;
  openDrawer: (controlId: string) => void;
  risksLink: (controlId: string) => unknown;
  onExported: (...args: unknown[]) => void;
  onImported: (...args: unknown[]) => void;
  /** A control's statement editor closed: its filter links may have changed. */
  onStatementsClosed: () => void;
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
