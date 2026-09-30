<template>
  <Dialog
    :visible="visible"
    modal
    header="New policy bundle"
    class="w-full max-w-lg"
    @update:visible="$emit('update:visible', $event)"
  >
    <form
      class="space-y-3"
      data-test="new-bundle-form"
      @submit.prevent="submit"
    >
      <div>
        <label class="field-label" for="nb-name">Name</label>
        <InputText
          id="nb-name"
          v-model="name"
          size="small"
          class="w-full font-mono"
          data-test="nb-name"
        />
        <p v-if="name && nameError" class="mt-1 text-xs text-red-600">
          {{ nameError }}
        </p>
      </div>
      <div>
        <label class="field-label" for="nb-extends">Extends (optional)</label>
        <InputText
          id="nb-extends"
          v-model="extendsSource"
          size="small"
          class="w-full font-mono"
          placeholder="ghcr.io/org/policies:v1"
          data-test="nb-extends"
        />
        <p v-if="extendsError" class="mt-1 text-xs text-red-600">
          {{ extendsError }}
        </p>
        <p
          v-else-if="extendsNeedsConfigure"
          class="mt-1 text-xs text-amber-700 dark:text-amber-300"
          data-test="nb-extends-r58"
        >
          Your role can only extend a source this agent already uses; saving a
          new source needs agent:configure.
        </p>
      </div>
      <fieldset v-if="plugins.length">
        <legend class="field-label">Use in plugins</legend>
        <label
          v-for="p in plugins"
          :key="p"
          class="mr-4 inline-flex items-center gap-2 text-sm"
        >
          <input
            v-model="usedBy"
            type="checkbox"
            :value="p"
            class="h-4 w-4"
            :data-test="`nb-use-${p}`"
          />
          <span class="font-mono">{{ p }}</span>
        </label>
      </fieldset>
      <div class="flex justify-end gap-2 pt-2">
        <TertiaryButton type="button" @click="$emit('update:visible', false)"
          >Cancel</TertiaryButton
        >
        <PrimaryButton type="submit" :disabled="!valid" data-test="nb-submit"
          >Create</PrimaryButton
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
import { NAME_RE, isInlineSource } from '@/utils/agent-config/validation';

const props = defineProps<{
  visible: boolean;
  taken: Set<string>;
  plugins: string[];
  /** Policy-only users (R58) may only extend already-used sources. */
  policyOnly?: boolean;
  usedSources?: Set<string>;
}>();
const emit = defineEmits<{
  'update:visible': [v: boolean];
  create: [b: { name: string; extends?: string; usedBy: string[] }];
}>();

const name = ref('');
const extendsSource = ref('');
const usedBy = ref<string[]>([]);
watch(
  () => props.visible,
  (v) => {
    if (v) {
      name.value = '';
      extendsSource.value = '';
      usedBy.value = [];
    }
  },
);

const nameError = computed(() => {
  if (!NAME_RE.test(name.value))
    return 'Use lowercase letters, digits, "_" and "-" (max 63)';
  if (props.taken.has(name.value)) return 'A bundle with this name exists';
  return '';
});
const extendsError = computed(() =>
  isInlineSource(extendsSource.value.trim())
    ? 'A bundle cannot extend another inline bundle'
    : '',
);
const extendsNeedsConfigure = computed(() => {
  const ext = extendsSource.value.trim();
  return !!props.policyOnly && !!ext && !(props.usedSources?.has(ext) ?? false);
});
const valid = computed(
  () => !!name.value && !nameError.value && !extendsError.value,
);

function submit() {
  if (!valid.value) return;
  const ext = extendsSource.value.trim();
  emit('create', {
    name: name.value,
    ...(ext ? { extends: ext } : {}),
    usedBy: usedBy.value,
  });
  emit('update:visible', false);
}
</script>

<style scoped>
@reference '@/assets/base.css';

.field-label {
  @apply mb-1 block text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400;
}
</style>
