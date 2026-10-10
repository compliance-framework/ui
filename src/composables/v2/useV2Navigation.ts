import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { navigationItems, type NavigationItem } from '@/config/navigation';
import { usePermissions } from '@/composables/usePermissions';

export interface V2NavItem {
  index: string;
  label: string;
  to: { name: string };
  activePaths: string[];
}

export interface V2NavSection {
  label: string;
  items: V2NavItem[];
}

// Top-level entries without children are grouped under "Workspace"; groups
// keep their own title, so the V2 sidebar mirrors main's grouped nav
// (backlog M3-04). Numbering runs across sections, as in the V2 design.
export function useV2Navigation() {
  const route = useRoute();
  const router = useRouter();
  const { can } = usePermissions();

  const allowed = (item: NavigationItem) =>
    !!item.name &&
    (!item.permission || can(item.permission.resource, item.permission.action));

  const navSections = computed<V2NavSection[]>(() => {
    const sections: Array<{ label: string; items: NavigationItem[] }> = [];
    for (const item of navigationItems) {
      if (item.children) {
        sections.push({ label: item.title, items: item.children });
        continue;
      }
      const last = sections[sections.length - 1];
      if (last?.label === 'Workspace') last.items.push(item);
      else sections.push({ label: 'Workspace', items: [item] });
    }

    let counter = 0;
    return sections
      .map((section) => ({
        label: section.label,
        items: section.items.filter(allowed).map((item) => ({
          index: String(++counter).padStart(2, '0'),
          label: item.title,
          to: { name: item.name! },
          activePaths: item.activePaths ?? [],
        })),
      }))
      .filter((section) => section.items.length);
  });

  const navItems = computed(() =>
    navSections.value.flatMap((section) => section.items),
  );

  function isActive(item: V2NavItem): boolean {
    const prefixes = [router.resolve(item.to).path, ...item.activePaths];
    return prefixes.some(
      (prefix) => route.path === prefix || route.path.startsWith(`${prefix}/`),
    );
  }

  return { navSections, navItems, isActive };
}
