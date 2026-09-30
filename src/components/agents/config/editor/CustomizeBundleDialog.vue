<template>
  <Dialog
    :visible="visible"
    modal
    header="Customize a bundle"
    class="w-full max-w-lg"
    @update:visible="$emit('update:visible', $event)"
  >
    <form class="space-y-3" data-test="customize-form" @submit.prevent="submit">
      <div>
        <label class="field-label" for="cb-plugin">Plugin</label>
        <select
          id="cb-plugin"
          v-model="plugin"
          class="form-select"
          data-test="cb-plugin"
        >
          <option v-for="p in pluginsWithSources" :key="p" :value="p">
            {{ p }}
          </option>
        </select>
      </div>
      <div>
        <label class="field-label" for="cb-source">Policy source</label>
        <select
          id="cb-source"
          v-model="source"
          class="form-select font-mono"
          data-test="cb-source"
        >
          <option v-for="s in sources" :key="s" :value="s">{{ s }}</option>
        </select>
      </div>
      <div>
        <label class="field-label" for="cb-name">Bundle name</label>
        <InputText
          id="cb-name"
          v-model="name"
          size="small"
          class="w-full font-mono"
          data-test="cb-name"
        />
        <p v-if="nameError" class="mt-1 text-xs text-red-600">
          {{ nameError }}
        </p>
      </div>
      <label class="flex items-start gap-2 text-sm">
        <input
          v-model="swap"
          type="checkbox"
          class="mt-1 h-4 w-4"
          data-test="cb-swap"
        />
        <span>
          Replace <code class="font-mono">{{ source }}</code> with
          <code class="font-mono">inline:{{ name }}</code> in {{ plugin }}'s
          policies (recommended: loading both would define the same packages
          twice).
        </span>
      </label>
      <div class="flex justify-end gap-2 pt-2">
        <TertiaryButton type="button" @click="$emit('update:visible', false)"
          >Cancel</TertiaryButton
        >
        <PrimaryButton type="submit" :disabled="!valid" data-test="cb-submit"
          >Customize</PrimaryButton
        >
      </div>
    </form>
  </Dialog>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import Dialog from '@/volt/Dialog.vue';
import InputText from '@/volt/InputText.vue';
import PrimaryButton from '@/volt/PrimaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { NAME_RE } from '@/utils/agent-config/validation';
import { sanitizeBundleName, uniqueName } from './useBundleOps';

const props = defineProps<{
  visible: boolean;
  plugins: string[];
  sourcesOf: (plugin: string) => string[];
  taken: Set<string>;
}>();
const emit = defineEmits<{
  'update:visible': [v: boolean];
  customize: [
    c: { plugin: string; source: string; name: string; swap: boolean },
  ];
}>();

const pluginsWithSources = computed(() =>
  props.plugins.filter((p) => props.sourcesOf(p).length),
);
const plugin = ref('');
const source = ref('');
const name = ref('');
const swap = ref(true);
const sources = computed(() =>
  plugin.value ? props.sourcesOf(plugin.value) : [],
);

watch(
  () => props.visible,
  (v) => {
    if (!v) return;
    plugin.value = pluginsWithSources.value[0] ?? '';
    swap.value = true;
  },
  { immediate: true },
);
watch(
  plugin,
  (p) => {
    source.value = sources.value[0] ?? '';
    name.value = p
      ? uniqueName(sanitizeBundleName(`${p}-custom`), props.taken)
      : '';
  },
  { immediate: true },
);

const nameError = computed(() => {
  if (!NAME_RE.test(name.value))
    return 'Use lowercase letters, digits, "_" and "-" (max 63)';
  if (props.taken.has(name.value)) return 'A bundle with this name exists';
  return '';
});
const valid = computed(
  () => !!plugin.value && !!source.value && !nameError.value,
);

function submit() {
  if (!valid.value) return;
  emit('customize', {
    plugin: plugin.value,
    source: source.value,
    name: name.value,
    swap: swap.value,
  });
  emit('update:visible', false);
}
</script>

<style scoped>
@reference '@/assets/base.css';

.field-label {
  @apply mb-1 block text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400;
}

.form-select {
  @apply w-full rounded-md border border-gray-300 px-2 py-1 text-sm dark:border-slate-600 dark:bg-slate-800;
}
</style>
