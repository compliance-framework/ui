import { inject, provide, type InjectionKey } from 'vue';
import type { ImplementedRequirement } from '@/oscal';

/**
 * What the Implementation screen tells each control row in its tree, provided once rather than
 * passed down every level of the recursive tree.
 */
export interface ControlTreeContext {
  sspId: () => string;
  query: () => string;
  suggestionsEnabled: () => boolean;
  implementation: (controlId: string) => ImplementedRequirement | undefined;
  byComponentCount: (controlId: string) => number;
  riskCount: (controlId: string) => number;
  riskSeverity: (controlId: string) => 'high' | 'medium' | 'low' | undefined;
  suggestionCount: (controlId: string) => number;
  highlighted: (controlId: string) => boolean;
  isOpen: (key: string) => boolean;
  setOpen: (key: string, open: boolean) => void;
  openDrawer: (controlId: string) => void;
  risksLink: (controlId: string) => unknown;
  onExported: (...args: unknown[]) => void;
  onImported: (...args: unknown[]) => void;
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
