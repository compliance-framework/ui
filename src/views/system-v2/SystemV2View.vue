<script setup lang="ts">
// V2 parent for `/system/*`. Main's `SystemView.vue` stays untouched (PRD §4.4);
// the router overlay mounts this instead. Children only render with an active
// SSP: without one they would request `system-security-plans//…` (backlog M0-05).
import { computed } from 'vue';
import { RouterView, useRoute } from 'vue-router';
import { useSystemStore } from '@/stores/system';
import { sspSectionTabRoutes } from '@/constants/ssp-section-tabs';
import V2PageHeader from '@/components/v2/patterns/V2PageHeader.vue';
import PrerequisiteGate from '@/components/v2/system/PrerequisiteGate.vue';

const systemStore = useSystemStore();
const route = useRoute();

const activePlan = computed(() => systemStore.system.securityPlan);
const activeRoute = computed(() => route.name as string);
const tabs = sspSectionTabRoutes('system:');
</script>

<template>
  <div v-if="!activePlan" class="space-y-6">
    <V2PageHeader
      eyebrow="System"
      title="Active System"
      description="Review and edit the System Security Plan you are working on."
    />
    <PrerequisiteGate
      title="No active system security plan"
      description="Select an active System Security Plan before working in the System module."
      cta-label="Select active SSP"
      :cta-to="{ name: 'system-security-plans' }"
      hint="Your selected plan drives all System module data."
      eyebrow="Scope Required"
    />
  </div>

  <div v-else class="space-y-6">
    <nav
      class="flex overflow-x-auto border border-[var(--ui-v2-border)] bg-[var(--ui-v2-card)]"
    >
      <RouterLink
        v-for="tab in tabs"
        :key="tab.route"
        :to="{ name: tab.route }"
        class="ui-v2-nav border-r border-[var(--ui-v2-border)] px-4 py-3 whitespace-nowrap"
        :class="
          activeRoute === tab.route
            ? 'bg-[var(--ui-v2-primary-tint-15)] text-[var(--ui-v2-foreground)]'
            : 'text-[var(--ui-v2-secondary-foreground)]'
        "
      >
        {{ tab.label }}
      </RouterLink>
    </nav>
    <RouterView v-slot="{ Component }">
      <KeepAlive><component :is="Component" /></KeepAlive>
    </RouterView>
  </div>
</template>
