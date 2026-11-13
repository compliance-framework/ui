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
 * path that contains the current URL wins. The system group links to the current system (the
 * system store, which the URL keeps in step). It is always shown, as in the classic app; with no
 * system chosen its pages ask for one.
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
        if (!router.hasRoute(item.route)) return [];
        if (
          item.permission &&
          !permissions.can(item.permission.resource, item.permission.action)
        )
          return [];
        // A page that takes the system from its URL needs one; with no system chosen it
        // leads to the Systems list to choose one. Classic pages prompt for a system themselves.
        const record = router.getRoutes().find((r) => r.name === item.route);
        const needsSystem = Boolean(record?.path.includes(':systemId'));
        const to =
          needsSystem && !system.value
            ? { name: 'systems' }
            : {
                name: item.route,
                params: needsSystem ? { systemId: system.value!.uuid } : {},
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
