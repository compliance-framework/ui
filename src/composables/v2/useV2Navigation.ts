import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { navigationItems, type NavigationItem } from '@/config/navigation';
import { usePermissions } from '@/composables/usePermissions';
import { useSystemStore } from '@/stores/system';

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
  const systemStore = useSystemStore();

  // Active System redirects to the active SSP's detail page (M1-10), so it
  // owns that page; other SSPs stay under Manage Systems.
  const extraActivePaths = (item: NavigationItem): string[] => {
    const sspId = systemStore.system.securityPlan?.uuid;
    return item.name === 'system:overview' && sspId
      ? [`/system-security-plans/${sspId}`]
      : [];
  };

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
          activePaths: [...(item.activePaths ?? []), ...extraActivePaths(item)],
        })),
      }))
      .filter((section) => section.items.length);
  });

  const navItems = computed(() =>
    navSections.value.flatMap((section) => section.items),
  );

  // Length of the item's longest path that matches the current route, or -1.
  function matchLength(item: V2NavItem): number {
    const prefixes = [router.resolve(item.to).path, ...item.activePaths];
    return Math.max(
      -1,
      ...prefixes
        .filter(
          (prefix) =>
            route.path === prefix || route.path.startsWith(`${prefix}/`),
        )
        .map((prefix) => prefix.length),
    );
  }

  // The most specific match wins, so only one item is ever highlighted.
  const activeItem = computed(() => {
    let best: V2NavItem | null = null;
    let bestLength = -1;
    for (const item of navItems.value) {
      const length = matchLength(item);
      if (length > bestLength) {
        best = item;
        bestLength = length;
      }
    }
    return best;
  });

  function isActive(item: V2NavItem): boolean {
    return activeItem.value?.index === item.index;
  }

  return { navSections, navItems, isActive };
}
