import { computed } from 'vue';
import { useRoute, useRouter, type RouteLocationRaw } from 'vue-router';
import type { IconName } from '@/ds/components/Icon/icons';
import { usePermissionsStore } from '@/stores/permissions';
import { useSystemStore } from '@/stores/system';
import { navGroups, type NavGroup } from './nav';

interface ResolvedNavItem {
  name: string;
  label: string;
  icon: IconName;
  to: RouteLocationRaw;
  path: string;
  active: boolean;
}

export interface ResolvedNavGroup extends Omit<NavGroup, 'items'> {
  items: ResolvedNavItem[];
  containsActive: boolean;
}

/**
 * The navigation the user may use, with the active item derived from the route: the deepest nav
 * path that contains the current URL wins. The system group links to the current system: the one
 * in the URL on a redesigned system page, otherwise the system store's (which classic system
 * pages read). It is hidden until a system is chosen.
 */
export function useNav() {
  const route = useRoute();
  const router = useRouter();
  const permissions = usePermissionsStore();
  const systemStore = useSystemStore();

  const system = computed(() => systemStore.system.securityPlan);

  const groups = computed<ResolvedNavGroup[]>(() => {
    const resolved = navGroups.map((group) => ({
      ...group,
      items: group.items.flatMap((item) => {
        if (group.id === 'system' && !system.value) return [];
        if (!router.hasRoute(item.route)) return [];
        if (
          item.permission &&
          !permissions.can(item.permission.resource, item.permission.action)
        )
          return [];
        const record = router.getRoutes().find((r) => r.name === item.route);
        const to = {
          name: item.route,
          params: record?.path.includes(':systemId')
            ? { systemId: system.value!.uuid }
            : {},
        };
        return [
          {
            name: item.route,
            label: item.label,
            icon: item.icon,
            to,
            path: router.resolve(to).path,
            active: false,
          },
        ];
      }),
    }));
    const current = route.path;
    const all = resolved.flatMap((group) => group.items);
    const best = all
      .filter(
        (item) => current === item.path || current.startsWith(`${item.path}/`),
      )
      .sort((a, b) => b.path.length - a.path.length)[0];
    for (const item of all) item.active = item === best;
    return resolved
      .filter((group) => group.items.length > 0)
      .map((group) => ({
        ...group,
        containsActive: group.items.some((item) => item.active),
      }));
  });

  return { groups, system };
}
