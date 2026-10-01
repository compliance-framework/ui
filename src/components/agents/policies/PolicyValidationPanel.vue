<template>
  <section
    class="space-y-2 rounded-md border border-ccf-300 p-3 dark:border-slate-700"
    data-test="validation-panel"
  >
    <header class="flex flex-wrap items-center gap-2">
      <h3 class="text-sm font-semibold text-gray-900 dark:text-slate-200">
        Validation
      </h3>
      <span class="text-xs" aria-live="polite" data-test="validation-status">
        <template v-if="status === 'checking'">
          <i class="pi pi-spin pi-spinner mr-1 text-[0.7rem]" />Checking with
          the API…
        </template>
        <span
          v-else-if="status === 'checked'"
          class="text-green-700 dark:text-green-300"
          ><i class="pi pi-check mr-1 text-[0.7rem]" />Checked against the
          agent's instances</span
        >
        <span
          v-else-if="status === 'failed'"
          class="text-amber-700 dark:text-amber-300"
          >Check failed: {{ error }}</span
        >
        <span v-else class="text-gray-500 dark:text-slate-400"
          >The API checks the pending changes shortly after each edit.</span
        >
      </span>
      <span class="flex-1" />
      <SecondaryButton
        size="small"
        :disabled="!canRun || status === 'checking'"
        data-test="validate-now"
        @click="$emit('run')"
      >
        Validate now
      </SecondaryButton>
    </header>
    <p
      v-if="!problems.length && !issues.length"
      class="text-xs text-gray-500 dark:text-slate-400"
      data-test="validation-empty"
    >
      No problems found.
    </p>
    <ul
      class="max-h-48 space-y-1 overflow-auto text-xs"
      data-test="validation-list"
    >
      <li
        v-for="(e, i) in problems"
        :key="`p${i}`"
        :class="
          e.severity === 'error'
            ? 'text-red-700 dark:text-red-300'
            : 'text-amber-700 dark:text-amber-300'
        "
        :data-test="
          e.severity === 'error' ? 'validation-error' : 'validation-warning'
        "
      >
        <button
          type="button"
          class="text-left hover:underline"
          @click="$emit('open', e.bundle, e.path)"
        >
          <code class="font-mono"
            >{{ e.bundle }}/{{ e.path
            }}<template v-if="e.row"
              >:{{ e.row }}:{{ e.col ?? 1 }}</template
            ></code
          >
          <span v-if="e.code" class="ml-1 font-medium">
            <CodeLabel :labels="POLICY_ERROR_CODE_LABELS" :code="e.code" />
          </span>
          — {{ e.message }}
        </button>
      </li>
      <li
        v-for="(i, idx) in issues"
        :key="`i${idx}`"
        :class="
          i.blocking
            ? 'text-red-700 dark:text-red-300'
            : 'text-amber-700 dark:text-amber-300'
        "
      >
        <code class="font-mono">{{ i.ptr || '/' }}</code> — {{ i.message }}
      </li>
    </ul>
  </section>
</template>

<script setup lang="ts">
// The Policies view's validation panel (R68, R89): the live / on-demand API preview's policy
// errors (with their R63 codes) and the draft's other issues.
import SecondaryButton from '@/volt/SecondaryButton.vue';
import type { PolicyError } from '@/types/agent-config';
import type { PreviewStatus } from '@/composables/agent-config/usePreview';
import type { ClientIssue } from '@/utils/agent-config/validation';
import CodeLabel from '../config/CodeLabel.vue';
import { POLICY_ERROR_CODE_LABELS } from '../config/constants';

defineProps<{
  status: PreviewStatus;
  error: string | null;
  canRun: boolean;
  problems: PolicyError[];
  issues: ClientIssue[];
}>();
defineEmits<{ run: []; open: [bundle: string, path: string] }>();
</script>
