<template>
  <div class="space-y-4" data-test="overlay-form">
    <div
      v-if="instanceOptions.length > 1"
      class="flex flex-wrap items-center gap-2 text-xs text-gray-500 dark:text-slate-400"
      data-test="placeholder-instance"
    >
      <span>Showing file values from</span>
      <Select
        :model-value="ctx.placeholderInstanceId.value"
        :options="instanceOptions"
        option-label="label"
        option-value="value"
        size="small"
        class="w-56"
        aria-label="Instance whose file values are shown"
        @update:model-value="ctx.placeholderInstanceId.value = $event"
      />
    </div>

    <FlagsSection />

    <section class="space-y-3">
      <div class="flex items-center justify-between">
        <h4 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
          Plugins
        </h4>
        <SecondaryButton
          size="small"
          :disabled="policyOnly"
          data-test="add-plugin"
          @click="addVisible = true"
        >
          <i class="pi pi-plus mr-1" />Add plugin
        </SecondaryButton>
      </div>
      <p v-if="!cards.length" class="text-sm text-gray-500 dark:text-slate-400">
        No plugins.
      </p>
      <PluginCard
        v-for="c in cards"
        :key="c.name"
        :name="c.name"
        :removed="c.removed"
      />
    </section>

    <slot name="policies" />

    <AddPluginDialog
      v-model:visible="addVisible"
      :existing="existingNames"
      @add="addPlugin"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import Select from '@/volt/Select.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { pointer } from '@/utils/agent-config/json-pointer';
import { isPlainObject } from '@/utils/agent-config/merge-patch';
import FlagsSection from './FlagsSection.vue';
import PluginCard from './PluginCard.vue';
import AddPluginDialog from './AddPluginDialog.vue';
import { useEditor } from './useEditor';

const { draft, ctx, policyOnly } = useEditor();
const addVisible = ref(false);

const instanceOptions = computed(() =>
  ctx.instances.value
    .filter((i) => ctx.instanceDetails.value.get(i.instanceId)?.base)
    .map((i) => ({
      label: `${i.hostname || i.instanceId.slice(0, 8)}${i.stale ? ' (stale)' : ''}`,
      value: i.instanceId,
    })),
);

// Card list = effective draft plugins + base plugins removed by the overlay, by name.
const cards = computed(() => {
  const eff = draft.effectiveDraft.value.plugins ?? {};
  const out = Object.keys(eff).map((name) => ({ name, removed: false }));
  const ov = draft.overlay.value.plugins;
  const base = ctx.placeholderBase.value?.plugins ?? {};
  if (isPlainObject(ov)) {
    for (const [name, v] of Object.entries(ov)) {
      if (v === null && base[name] && !(name in eff))
        out.push({ name, removed: true });
    }
  }
  return out.sort((a, b) => a.name.localeCompare(b.name));
});

const existingNames = computed(() => {
  const names = new Set(cards.value.map((c) => c.name));
  for (const b of ctx.bases.value)
    Object.keys(b.plugins ?? {}).forEach((n) => names.add(n));
  return Array.from(names);
});

function addPlugin(plugin: {
  name: string;
  source: string;
  schedule?: string;
}) {
  draft.set(pointer('plugins', plugin.name), {
    source: plugin.source,
    ...(plugin.schedule ? { schedule: plugin.schedule } : {}),
    policies: [],
  });
}
</script>
