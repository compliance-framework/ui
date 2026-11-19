import type { TreeNode } from '@/composables/useCatalogTree';
import type { Control } from '@/oscal';

/** A catalog group's controls, as one titled section of the Implementation list. */
export interface ControlSection {
  key: string;
  /** The group's title, after its parent groups' ("Access control › Account management"). */
  title: string;
  controls: Control[];
}

const withdrawn = (control: Control) =>
  (control.props ?? []).some(
    (p) => p.name === 'status' && p.value === 'withdrawn',
  );

/**
 * The controls of the chosen profiles, by catalog group, without the profiles: groups the profiles
 * share become one section, and a control in several profiles shows once. Each group, nested or
 * not, is a section of its own. Only controls whose ID or title contains the search are kept, and
 * sections left empty are dropped.
 *
 * Enhancements and withdrawn controls are left out: the API's resolved profile includes every
 * enhancement of a chosen control and the withdrawn controls, whether the profile chose them or
 * not, so listing them would show controls the system doesn't implement.
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
      if (node.type !== 'control')
        walk(node.children ?? [], [...path, node.data.title]);
      else if (!withdrawn(node.data as Control))
        add(node.data as Control, path);
    }
  };
  for (const profile of profiles) walk(profile.children ?? [], []);
  return [...sections.values()];
}
