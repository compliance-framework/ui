<template>
  <div
    class="px-4 py-4 bg-white dark:bg-slate-950 border-b border-ccf-300 dark:border-slate-700"
  >
    <p class="font-medium mb-2">By ID</p>
    <div class="flex flex-wrap gap-2 mb-2">
      <Chip
        v-for="(id, i) in modelValue"
        :key="id"
        :label="id"
        removable
        @remove="remove(i)"
      />
    </div>
    <div class="flex gap-2">
      <AutoComplete
        v-model="newId"
        type="text"
        placeholder="Enter control ID (e.g. ac-1)"
        class="grow"
        :suggestions="items"
        optionLabel="value"
        dropdown
        @complete="search"
      >
        <template #option="slotProps">
          <div class="flex items-center">
            <div>{{ slotProps.option.label }}</div>
          </div>
        </template>
      </AutoComplete>
      <PrimaryButton @click="add()">Add</PrimaryButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { type PropType } from 'vue';
import Chip from '@/volt/Chip.vue';
import PrimaryButton from '@/components/PrimaryButton.vue';
import AutoComplete from '@/volt/AutoComplete.vue';
import type {
  ControlOption,
  SelectControl,
} from '@/composables/useControlList';

const props = defineProps({
  modelValue: {
    type: Array as PropType<string[]>,
    required: true,
  },
  controlList: {
    type: Array as PropType<SelectControl[]>,
    required: false,
    default: () => [],
  },
});
const emit = defineEmits<{
  (e: 'update:modelValue', v: string[]): void;
}>();

const newId = ref<ControlOption>({ label: '', value: '' });

const items = ref<ControlOption[]>([]);

function add() {
  const val = newId.value.value.trim();
  if (!val) return;
  if (!props.modelValue.includes(val)) {
    emit('update:modelValue', [...props.modelValue, val]);
  }
  newId.value = { label: '', value: '' };
}

function remove(index: number) {
  const arr = [...props.modelValue];
  arr.splice(index, 1);
  emit('update:modelValue', arr);
}

/**
 * Search items (and their parent groups) and return a flat list of options.
 * - Case/accent-insensitive.
 * - Matches on item.label, item.value, group.label, group.code.
 * - Tokens: all words in the query must be present somewhere in the combined text.
 * - Results are ranked so exact/startsWith/value matches appear first.
 */
function search(event: { query: string }) {
  const q = normalize(event.query.trim());
  const tokens = q ? q.split(/\s+/) : [];

  const results: { opt: ControlOption; score: number }[] = [];
  const seen = new Set<string>(); // dedupe by value

  for (const group of props.controlList) {
    const gLabel = normalize(group.label);
    const gCode = normalize(group.code);

    for (const item of group.items) {
      const iLabel = normalize(item.label);
      const iValue = normalize(item.value);

      // Combine searchable text for token checks
      const haystack = `${iLabel} ${iValue} ${gLabel} ${gCode}`.trim();

      // If there's a query, require all tokens to appear somewhere
      if (tokens.length && !tokens.every((t) => haystack.includes(t))) continue;

      let score = 0;

      // Ranking heuristics (bigger is better)
      if (q.length) {
        // Strong boosts for value matches (useful for "BD-2.3" queries)
        if (iValue === q) score += 1000;
        if (iValue.startsWith(q)) score += 400;
        if (iValue.includes(q)) score += 250;

        // Label relevance
        if (iLabel.startsWith(q)) score += 150;
        if (iLabel.includes(q)) score += 120;

        // Group context relevance
        if (gCode.startsWith(q)) score += 80;
        if (gCode.includes(q)) score += 60;
        if (gLabel.includes(q)) score += 40;

        // Slight reward per satisfied token
        score += tokens.length * 5;
      }

      // Dedupe by value while keeping best score
      if (!seen.has(item.value)) {
        results.push({ opt: { label: item.label, value: item.value }, score });
        seen.add(item.value);
      }
    }
  }

  results.sort(
    (a, b) =>
      b.score - a.score ||
      a.opt.label.localeCompare(b.opt.label, undefined, { numeric: true }),
  );

  items.value = results
    .map((r) => r.opt)
    .filter((r) => !props.modelValue.includes(r.value));
}

/** Lowercase, strip accents, collapse spaces, keep letters/numbers/.- */
function normalize(str: string): string {
  return (
    str
      .toLowerCase()
      .normalize('NFD')
      // strip combining diacritical marks
      .replace(/[\u0300-\u036f]/g, '')
      // replace non word-ish chars (but keep dot/hyphen) with spaces
      .replace(/[^a-z0-9.\-]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim()
  );
}
</script>
