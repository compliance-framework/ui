import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { navigationItems } from '@/config/navigation';
import { usePermissions } from '@/composables/usePermissions';

export function useV2Navigation() {
  const route = useRoute();
  const router = useRouter();
  const { can } = usePermissions();
  const navItems = computed(() =>
    navigationItems
      .flatMap((item) => item.children ?? [item])
      .filter(
        (item) =>
          item.name &&
          (!item.permission ||
            can(item.permission.resource, item.permission.action)),
      )
      .map((item, index) => ({
        index: String(index + 1).padStart(2, '0'),
        label: item.title,
        to: { name: item.name! },
      })),
  );

  function isActive(item: (typeof navItems.value)[number]): boolean {
    const target = router.resolve(item.to);
    return (
      route.path === target.path || route.path.startsWith(`${target.path}/`)
    );
  }

  return { navItems, isActive };
}
