<template>
  <table class="w-full text-left text-xs" data-test="diff-rows">
    <tbody>
      <tr v-if="!rows.length">
        <td class="py-1 text-gray-500">No differences.</td>
      </tr>
      <tr
        v-for="row in rows"
        :key="row.path"
        class="border-t border-ccf-300 align-top dark:border-slate-700"
        :data-path="row.path"
      >
        <td class="py-1 pr-2 font-mono break-all">{{ row.path }}</td>
        <td class="py-1 pr-2">
          <template v-if="row.multiline">
            <button
              type="button"
              class="text-sky-700 hover:underline dark:text-sky-300"
              data-test="view-diff"
              @click="$emit('open-diff', row)"
            >
              View diff
            </button>
          </template>
          <template v-else>
            <ValueCell :value="row.before" :missing="row.kind === 'added'" />
            <span class="mx-1 text-gray-400">→</span>
            <ValueCell :value="row.after" :missing="row.kind === 'removed'" />
          </template>
        </td>
        <td v-if="!hideTags" class="py-1 text-right">
          <SafetyTag :kind="safetyForRow(row.path, changes)" />
        </td>
      </tr>
    </tbody>
  </table>
</template>

<script setup lang="ts">
import { defineComponent, h, ref } from 'vue';
import type { ConfigChange } from '@/types/agent-config';
import type { DiffEntry } from '@/utils/agent-config/config-diff';
import SafetyTag from './SafetyTag.vue';
import { safetyForRow, truncate } from './review';

defineProps<{
  rows: DiffEntry[];
  changes: ConfigChange[];
  hideTags?: boolean;
}>();
defineEmits<{ 'open-diff': [row: DiffEntry] }>();

// A value truncated to 120 characters with a "show" toggle.
const ValueCell = defineComponent({
  props: { value: { type: null, default: undefined }, missing: Boolean },
  setup(p) {
    const open = ref(false);
    return () => {
      if (p.missing)
        return h('span', { class: 'text-gray-400 italic' }, 'absent');
      const t = truncate(p.value);
      const full = truncate(p.value, Number.MAX_SAFE_INTEGER).text;
      return h('span', { class: 'font-mono break-all' }, [
        open.value ? full : t.text,
        t.truncated
          ? h(
              'button',
              {
                type: 'button',
                class: 'ml-1 text-sky-700 hover:underline dark:text-sky-300',
                onClick: () => (open.value = !open.value),
              },
              open.value ? 'hide' : 'show',
            )
          : null,
      ]);
    };
  },
});
</script>
