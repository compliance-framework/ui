<template>
  <div class="space-y-1" :data-test="`policies-${plugin}`">
    <div class="flex items-center gap-2">
      <span
        class="text-xs font-medium tracking-wide text-gray-500 uppercase dark:text-slate-400"
        >Policies</span
      >
      <span v-if="!overridden" class="text-[0.7rem] text-gray-400"
        >(file value)</span
      >
      <FieldHints :ptr="ptr" @reset="draft.unset(ptr)" />
    </div>
    <ol class="space-y-1">
      <li
        v-for="(entry, idx) in entries"
        :key="`${idx}-${entry}`"
        class="flex flex-wrap items-center gap-2 text-xs"
        :class="{ 'text-gray-400 dark:text-slate-500': !overridden }"
        :data-entry="entry"
      >
        <span class="w-5 text-right text-gray-400">{{ idx + 1 }}.</span>
        <code class="min-w-0 font-mono break-all">{{ entry }}</code>
        <span class="inline-flex shrink-0 gap-1" data-test="policy-actions">
          <button
            type="button"
            class="px-1 disabled:opacity-30"
            :disabled="idx === 0"
            :aria-label="`Move ${entry} up`"
            @click="move(idx, -1)"
          >
            <i class="pi pi-arrow-up text-[0.7rem]" />
          </button>
          <button
            type="button"
            class="px-1 disabled:opacity-30"
            :disabled="idx === entries.length - 1"
            :aria-label="`Move ${entry} down`"
            @click="move(idx, 1)"
          >
            <i class="pi pi-arrow-down text-[0.7rem]" />
          </button>
          <button
            type="button"
            class="px-1 text-red-600 dark:text-red-400"
            :aria-label="`Remove ${entry}`"
            data-test="remove-policy"
            @click="removeAt(idx)"
          >
            <i class="pi pi-times text-[0.7rem]" />
          </button>
        </span>
        <span
          v-if="hint(entry)"
          class="rounded px-1 text-[0.7rem]"
          :class="
            hint(entry)!.safe === hint(entry)!.total
              ? 'bg-green-100 text-green-700 dark:bg-green-500/15 dark:text-green-300'
              : 'bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300'
          "
          data-test="trust-hint"
          >trusted on {{ hint(entry)!.safe }}/{{ hint(entry)!.total }} instances
          · {{ hint(entry)!.label }}</span
        >
      </li>
      <li v-if="!entries.length" class="text-xs text-gray-500">
        No policy sources.
      </li>
    </ol>
    <form class="flex items-center gap-2" @submit.prevent="add">
      <InputText
        v-model="newEntry"
        size="small"
        class="flex-1"
        placeholder="OCI reference or local path"
        :aria-label="`Add a policy source to ${plugin}`"
        data-test="new-policy"
      />
      <SecondaryButton
        size="small"
        type="submit"
        :disabled="!!addError || !newEntry.trim()"
      >
        Add
      </SecondaryButton>
    </form>
    <p v-if="addError" class="text-xs text-red-600 dark:text-red-400">
      {{ addError }}
    </p>
    <FieldIssues :ptr="ptr" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import { pointer } from '@/utils/agent-config/json-pointer';
import FieldHints from './FieldHints.vue';
import FieldIssues from './FieldIssues.vue';
import { useEditor } from './useEditor';

const props = defineProps<{ plugin: string }>();

const { draft, has, effectiveValue, trustHint } = useEditor();

const ptr = computed(() => pointer('plugins', props.plugin, 'policies'));
const overridden = computed(() => has(ptr.value));
const entries = computed<string[]>(() => {
  const v = effectiveValue(ptr.value);
  return Array.isArray(v) ? (v as string[]) : [];
});
const newEntry = ref('');

const addError = computed(() => {
  const e = newEntry.value.trim();
  if (!e) return '';
  if (entries.value.includes(e)) return 'Already in the list';
  return '';
});

function hint(entry: string) {
  return trustHint(ptr.value, entry);
}

/** Arrays replace wholesale (RFC 7396): every write sends the whole list. */
function write(next: string[]) {
  draft.set(ptr.value, next);
}

function move(idx: number, delta: number) {
  const next = [...entries.value];
  const [item] = next.splice(idx, 1);
  next.splice(idx + delta, 0, item);
  write(next);
}

function removeAt(idx: number) {
  write(entries.value.filter((_, i) => i !== idx));
}

function add() {
  const e = newEntry.value.trim();
  if (!e || addError.value) return;
  write([...entries.value, e]);
  newEntry.value = '';
}
</script>
