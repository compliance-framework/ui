<template>
  <div class="space-y-3">
    <div
      v-for="(link, index) in model"
      :key="index"
      class="rounded-md border border-ccf-300 p-3 dark:border-slate-700"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <div class="md:col-span-2">
            <label
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Href
            </label>
            <InputText
              v-model="link.href"
              placeholder="URL or #resource reference"
              size="small"
              class="mt-1 w-full"
            />
          </div>
          <div>
            <label
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Rel
            </label>
            <InputText
              v-model="link.rel"
              placeholder="Relationship (e.g. reference)"
              size="small"
              class="mt-1 w-full"
            />
          </div>
          <div>
            <label
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Text
            </label>
            <InputText
              v-model="link.text"
              placeholder="Display text"
              size="small"
              class="mt-1 w-full"
            />
          </div>
        </div>
        <TertiaryButton
          type="button"
          class="px-1!"
          :aria-label="`Remove link ${index + 1}`"
          @click="remove(index)"
        >
          <BIconX />
        </TertiaryButton>
      </div>
    </div>

    <p v-if="!model.length" class="text-sm text-gray-600 dark:text-slate-400">
      No links added.
    </p>

    <SecondaryButton size="small" type="button" @click="add">
      Add Link
    </SecondaryButton>
  </div>
</template>

<script setup lang="ts">
import type { Link } from '@/oscal';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { BIconX } from 'bootstrap-icons-vue';

const model = defineModel<Link[]>({ required: true });

function add() {
  model.value = [...model.value, { href: '' }];
}

function remove(index: number) {
  model.value = model.value.filter((_, i) => i !== index);
}
</script>
