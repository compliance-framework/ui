<template>
  <div class="space-y-3">
    <div class="flex flex-wrap items-center justify-between gap-2">
      <p v-if="legend" class="text-sm text-gray-500 dark:text-slate-400">
        <i class="pi pi-lock mr-1 text-xs" />{{ legend }}
      </p>
      <span v-else />
      <div class="flex gap-2">
        <SecondaryButton
          size="small"
          :disabled="isEmpty"
          data-test="yaml-copy"
          @click="copy"
        >
          <i class="pi pi-copy mr-2" />Copy
        </SecondaryButton>
        <SecondaryButton
          size="small"
          :disabled="isEmpty"
          data-test="yaml-download"
          @click="download"
        >
          <i class="pi pi-download mr-2" />Download
        </SecondaryButton>
      </div>
    </div>
    <p
      v-if="isEmpty"
      class="rounded-md border border-dashed border-ccf-300 p-4 text-sm text-gray-500 dark:border-slate-700 dark:text-slate-400"
      data-test="yaml-empty"
    >
      {{ emptyText }}
    </p>
    <div
      v-else
      class="max-h-[600px] overflow-auto rounded-lg border bg-gray-900 p-4 text-gray-100"
    >
      <pre
        class="font-mono text-sm whitespace-pre-wrap"
        data-test="yaml-text"
        >{{ text }}</pre
      >
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useToast } from 'primevue/usetoast';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { toYaml } from '@/utils/agent-config/yaml';

const props = defineProps<{
  doc: object | null;
  filename: string;
  emptyText: string;
  legend?: string;
}>();

const toast = useToast();

const isEmpty = computed(() => props.doc === null || props.doc === undefined);
const text = computed(() => (isEmpty.value ? '' : toYaml(props.doc)));

async function copy() {
  try {
    if (!navigator.clipboard) throw new Error('Clipboard API unavailable');
    await navigator.clipboard.writeText(text.value);
    toast.add({
      severity: 'success',
      summary: 'Copied',
      detail: 'YAML copied to the clipboard.',
      life: 2500,
    });
  } catch {
    toast.add({
      severity: 'error',
      summary: 'Copy Failed',
      detail: 'Unable to copy to the clipboard.',
      life: 3000,
    });
  }
}

function download() {
  const blob = new Blob([text.value], { type: 'application/yaml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = props.filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
</script>
