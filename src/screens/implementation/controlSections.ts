import type { TreeNode } from '@/composables/useCatalogTree';
import type { Control } from '@/oscal';

/** A catalog group's controls, as one titled section of the Implementation list. */
export interface ControlSection {
  key: string;
  /** The group's title, after its parent groups' ("Access control › Account management"). */
  title: string;
  controls: Control[];
}

/**
 * The controls of the chosen profiles, by catalog group, without the profiles: groups the profiles
 * share become one section, and a control in several profiles shows once. Each group, nested or
 * not, is a section of its own; a control's enhancements follow it. Only controls whose ID or title
 * contains the search are kept, and sections left empty are dropped.
 */
export function controlSections(
  profiles: TreeNode[],
  search: string,
): ControlSection[] {
  const q = search.trim().toLowerCase();
  const sections = new Map<string, ControlSection>();
  const seen = new Set<string>();

  const add = (control: Control, path: string[]) => {
    const id = control.id.toLowerCase();
    if (seen.has(id)) return;
    seen.add(id);
    if (q && !`${control.id} ${control.title}`.toLowerCase().includes(q))
      return;
    const key = path.join(' › ');
    const section = sections.get(key) ?? {
      key,
      title: key || 'Ungrouped',
      controls: [],
    };
    section.controls.push(control);
    sections.set(key, section);
  };
  const walk = (nodes: TreeNode[], path: string[]) => {
    for (const node of nodes) {
      if (node.type === 'control') {
        add(node.data as Control, path);
        walk(node.children ?? [], path);
      } else walk(node.children ?? [], [...path, node.data.title]);
    }
  };
  for (const profile of profiles) walk(profile.children ?? [], []);
  return [...sections.values()];
}
