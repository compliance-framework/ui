<script setup lang="ts">
import { RouterView } from 'vue-router';
import V2SideNavigation from '@/components/v2/navigation/V2SideNavigation.vue';
import V2TopNavigation from '@/components/v2/navigation/V2TopNavigation.vue';
import V2UserMenu from '@/components/v2/navigation/V2UserMenu.vue';
import ActiveSecurityPlanIndicator from '@/components/v2/system/ActiveSecurityPlanIndicator.vue';
</script>

<template>
  <div class="ui-v2 min-h-screen bg-[var(--ui-v2-background)]">
    <header
      class="sticky top-0 z-40 flex h-16 items-center justify-between border-b border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)] px-4 sm:px-6 lg:px-10"
    >
      <div class="flex items-center gap-2">
        <div class="h-[14px] w-[14px] bg-[var(--ui-v2-primary)]" />
        <span class="ui-v2-logo text-[var(--ui-v2-foreground)]"> CCF </span>
      </div>

      <V2UserMenu />
    </header>

    <V2TopNavigation />

    <div class="flex min-h-[calc(100vh-64px)]">
      <V2SideNavigation />

      <main class="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
        <div class="mb-6">
          <ActiveSecurityPlanIndicator />
        </div>

        <RouterView v-slot="{ Component }">
          <KeepAlive include="CatalogView">
            <component :is="Component" />
          </KeepAlive>
        </RouterView>
      </main>
    </div>
  </div>
</template>
