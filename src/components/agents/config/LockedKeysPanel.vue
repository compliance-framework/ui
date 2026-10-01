<template>
  <section
    class="rounded-md border border-ccf-300 bg-slate-50 p-4 dark:border-slate-700 dark:bg-slate-800/60"
    data-test="locked-keys"
  >
    <h4 class="mb-1 text-sm font-semibold text-gray-900 dark:text-slate-200">
      <i class="pi pi-lock mr-1 text-xs text-gray-400" />Set on the agent host
    </h4>
    <p class="mb-3 text-xs text-gray-500 dark:text-slate-400">
      {{ FORBIDDEN_TOOLTIP }}.
    </p>
    <dl class="grid grid-cols-1 gap-x-6 gap-y-2 text-sm md:grid-cols-2">
      <div
        v-for="row in rows"
        :key="row.key"
        class="flex items-start gap-2"
        data-state="forbidden"
        :data-test="`locked-${row.key}`"
      >
        <dt class="font-mono text-xs text-gray-400 dark:text-slate-500">
          <i
            v-tooltip.top="FORBIDDEN_TOOLTIP"
            role="img"
            tabindex="0"
            class="pi pi-lock mr-2 text-xs text-gray-400"
            :aria-label="FORBIDDEN_TOOLTIP"
            data-test="lock-icon"
          />{{ row.key }}
        </dt>
        <dd class="break-all text-gray-500 dark:text-slate-400">
          <template v-if="Array.isArray(row.value)">
            <span v-if="!row.value.length" class="text-gray-400">none</span>
            <span
              v-for="v in row.value"
              :key="v"
              class="mr-1 inline-block rounded bg-slate-200 px-1.5 font-mono text-xs dark:bg-slate-700"
              >{{ v }}</span
            >
          </template>
          <template v-else>{{ row.value }}</template>
        </dd>
      </div>
    </dl>
  </section>
</template>

<script setup lang="ts">
// R71 "forbidden" state: api.*, daemon and remote_config.* are muted, locked and never get a
// pencil; they can only change on the agent host (file, environment or CLI, R30).
import { computed } from 'vue';
import type { ConfigDoc } from '@/types/agent-config';
import { FORBIDDEN_TOOLTIP } from '@/utils/agent-config/field-access';

const props = defineProps<{ doc: ConfigDoc | null }>();

// api.auth.client_secret is never shown (only client_id).
const rows = computed(() => {
  const d = props.doc ?? {};
  const rc = d.remote_config ?? {};
  const show = (v: unknown, fallback = '—') =>
    v === undefined || v === null || v === '' ? fallback : String(v);
  return [
    { key: 'api.url', value: show(d.api?.url) },
    { key: 'api.auth.client_id', value: show(d.api?.auth?.client_id) },
    { key: 'daemon', value: show(d.daemon) },
    { key: 'remote_config.mode', value: show(rc.mode, 'off') },
    {
      key: 'remote_config.poll_interval',
      value: show(rc.poll_interval, '60s'),
    },
    { key: 'remote_config.trusted_sources', value: rc.trusted_sources ?? [] },
    {
      key: 'remote_config.overridable_config_flags',
      value: rc.overridable_config_flags ?? [],
    },
    {
      key: 'remote_config.allow_local_sources',
      value: show(rc.allow_local_sources, 'false'),
    },
    {
      key: 'remote_config.allow_inline_policies',
      value: show(rc.allow_inline_policies, 'true'),
    },
  ];
});
</script>
