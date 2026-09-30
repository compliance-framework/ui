<template>
  <article
    class="rounded-md border border-ccf-300 p-4 dark:border-slate-700"
    :class="{ 'opacity-60': removed }"
    :data-test="`plugin-card-${name}`"
  >
    <header class="mb-2 flex flex-wrap items-center gap-2">
      <h4
        class="font-mono text-sm font-semibold text-gray-900 dark:text-slate-200"
      >
        {{ name }}
      </h4>
      <ProvenanceBadge :provenance="cardProvenance" />
      <ConfigPill v-if="plugin?.enabled === false" severity="secondary">
        Disabled
      </ConfigPill>
      <span v-if="removed" class="text-xs text-red-600 dark:text-red-400">
        Removed by overlay
      </span>
    </header>
    <dl class="grid grid-cols-1 gap-x-6 gap-y-1 text-sm md:grid-cols-2">
      <div class="flex items-center gap-2 md:col-span-2">
        <dt class="text-gray-500 dark:text-slate-400">Source</dt>
        <dd class="break-all font-mono text-xs">{{ plugin?.source ?? '—' }}</dd>
        <ProvenanceBadge
          v-if="field('source') !== 'file'"
          :provenance="field('source')"
        />
      </div>
      <div class="flex items-center gap-2">
        <dt class="text-gray-500 dark:text-slate-400">Schedule</dt>
        <dd>
          <span class="font-mono text-xs">{{
            plugin?.schedule ?? '* * * * *'
          }}</span>
          <span class="ml-1 text-xs text-gray-500">({{ scheduleText }})</span>
        </dd>
        <ProvenanceBadge
          v-if="field('schedule') !== 'file'"
          :provenance="field('schedule')"
        />
      </div>
      <div class="flex items-center gap-2">
        <dt class="text-gray-500 dark:text-slate-400">Protocol</dt>
        <dd>{{ plugin?.protocol_version ?? 'auto' }}</dd>
        <ProvenanceBadge
          v-if="field('protocol_version') !== 'file'"
          :provenance="field('protocol_version')"
        />
      </div>
      <div class="flex flex-wrap items-center gap-2 md:col-span-2">
        <dt class="text-gray-500 dark:text-slate-400">Policies</dt>
        <dd class="flex flex-wrap gap-1">
          <span v-if="!policies.length" class="text-gray-500">none</span>
          <template v-for="p in policies" :key="p">
            <a
              v-if="p.startsWith('inline:')"
              :href="`#agent-bundle-${p.slice(7)}`"
              class="rounded bg-sky-100 px-1.5 font-mono text-xs text-sky-700 hover:underline dark:bg-sky-500/15 dark:text-sky-300"
              @click.prevent="$emit('show-bundle', p.slice(7))"
              >{{ p }}</a
            >
            <span
              v-else
              class="rounded bg-slate-200 px-1.5 font-mono text-xs break-all dark:bg-slate-700"
              >{{ p }}</span
            >
          </template>
        </dd>
        <ProvenanceBadge
          v-if="field('policies') !== 'file'"
          :provenance="field('policies')"
        />
      </div>
      <div class="flex items-center gap-2">
        <dt class="text-gray-500 dark:text-slate-400">Config</dt>
        <dd>{{ count(plugin?.config) }} keys</dd>
        <ProvenanceBadge
          v-if="field('config') !== 'file'"
          :provenance="field('config')"
        />
      </div>
      <div class="flex items-center gap-2">
        <dt class="text-gray-500 dark:text-slate-400">Labels</dt>
        <dd>{{ count(plugin?.labels) }}</dd>
        <ProvenanceBadge
          v-if="field('labels') !== 'file'"
          :provenance="field('labels')"
        />
      </div>
      <div v-if="plugin?.policy_data" class="flex items-center gap-2">
        <dt class="text-gray-500 dark:text-slate-400">Policy data</dt>
        <dd>{{ count(plugin.policy_data) }} keys</dd>
        <ProvenanceBadge
          v-if="field('policy_data') !== 'file'"
          :provenance="field('policy_data')"
        />
      </div>
    </dl>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { ConfigDoc, OverlayDoc, PluginDoc } from '@/types/agent-config';
import { pointer } from '@/utils/agent-config/json-pointer';
import {
  pluginProvenance,
  provenanceOf,
  type Provenance,
} from '@/utils/agent-config/provenance';
import { describeCron5 } from '@/utils/agent-config/cron5';
import ProvenanceBadge from './ProvenanceBadge.vue';
import ConfigPill from './ConfigPill.vue';

const props = defineProps<{
  name: string;
  /** Effective plugin, or the base plugin when the overlay removed it. */
  plugin: PluginDoc | null;
  base: ConfigDoc | null;
  overlay: OverlayDoc | null;
  removed?: boolean;
}>();

defineEmits<{ 'show-bundle': [name: string] }>();

const cardProvenance = computed<Provenance>(() =>
  pluginProvenance(props.name, props.base ?? {}, props.overlay ?? {}),
);

function field(key: string): Provenance {
  return provenanceOf(
    pointer('plugins', props.name, key),
    props.base ?? {},
    props.overlay ?? {},
  );
}

const policies = computed(() => props.plugin?.policies ?? []);
const scheduleText = computed(() =>
  describeCron5(props.plugin?.schedule ?? '* * * * *'),
);

function count(v: unknown): number {
  return v && typeof v === 'object' ? Object.keys(v).length : 0;
}
</script>
