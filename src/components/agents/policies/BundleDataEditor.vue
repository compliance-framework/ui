<template>
  <section class="space-y-2" data-test="bundle-data">
    <h3 class="font-mono text-sm font-semibold">{{ bundle }} · data</h3>
    <p
      v-if="dataFileModule"
      class="text-xs text-gray-500"
      data-test="data-disabled"
    >
      <i class="pi pi-lock mr-1" />This bundle has a {{ dataFileModule }}
      module; data and a root data file are mutually exclusive.
    </p>
    <template v-else>
      <CodeEditor
        :model-value="text"
        language="json"
        :readonly="readonly"
        min-height="200px"
        max-height="calc(100vh - 22rem)"
        :label="`Data of ${bundle}`"
        @update:model-value="onInput"
      />
      <p v-if="error" class="text-xs text-red-600" data-test="data-error">
        {{ error }}
      </p>
    </template>
  </section>
</template>

<script setup lang="ts">
// Bundle `data` (valid JSON objects only; exclusive with a root data.json/yaml/yml module,
// R18). Objects merge under RFC 7396: the draft gets the full target plus nulls for file keys
// the user removed, never the file's masked values (R25).
import { computed, ref, watch } from 'vue';
import { CodeEditor } from '@/components/code-editor';
import type { PolicyBundleDoc } from '@/types/agent-config';
import {
  deepEqual,
  isPlainObject,
  mergePatch,
} from '@/utils/agent-config/merge-patch';
import { replacingPatch } from '@/utils/agent-config/overlay-ops';
import { DATA_FILE_RE } from '@/utils/agent-config/validation';

const props = defineProps<{
  bundle: string;
  doc: PolicyBundleDoc;
  fileBundle: PolicyBundleDoc | null;
  readonly?: boolean;
}>();
const emit = defineEmits<{ update: [data: Record<string, unknown>] }>();

const dataFileModule = computed(
  () =>
    Object.keys(props.doc.modules ?? {}).find((p) => DATA_FILE_RE.test(p)) ??
    null,
);
const text = ref(JSON.stringify(props.doc.data ?? {}, null, 2));
const error = ref('');
watch(
  () => props.doc.data,
  (d) => {
    if (error.value) return;
    try {
      if (deepEqual(mergePatch({}, JSON.parse(text.value)), d ?? {})) return;
    } catch {
      return;
    }
    text.value = JSON.stringify(d ?? {}, null, 2);
  },
);

function onInput(value: string) {
  text.value = value;
  try {
    const parsed = value.trim() ? JSON.parse(value) : {};
    if (!isPlainObject(parsed))
      throw new Error('Bundle data must be a JSON object');
    error.value = '';
    emit(
      'update',
      replacingPatch(props.fileBundle?.data, parsed) as Record<string, unknown>,
    );
  } catch (e) {
    error.value = (e as Error).message;
  }
}
</script>
