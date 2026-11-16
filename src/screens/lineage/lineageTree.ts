import { inject, provide, type InjectionKey } from 'vue';
import type { LineageTreeNode } from '@/composables/useLineage/types';

/** What each Compliance Map tree node needs from the tree tab: expansion, lazy children, details. */
export interface LineageTreeContext {
  isOpen(key: string): boolean;
  setOpen(node: LineageTreeNode, open: boolean): void;
  select(node: LineageTreeNode): void;
}

const key: InjectionKey<LineageTreeContext> = Symbol('lineage-tree');

export function provideLineageTree(context: LineageTreeContext) {
  provide(key, context);
}

export function useLineageTree(): LineageTreeContext {
  const context = inject(key);
  if (!context) throw new Error('LineageTreeItem needs a LineageTreeTab.');
  return context;
}
