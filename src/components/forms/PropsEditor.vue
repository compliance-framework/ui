<template>
  <div class="space-y-3">
    <div
      v-for="(prop, index) in model"
      :key="index"
      class="rounded-md border border-ccf-300 p-3 dark:border-slate-700"
    >
      <div class="flex items-start justify-between gap-2">
        <div class="grid flex-1 grid-cols-1 gap-3 md:grid-cols-2">
          <div>
            <label
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Name
            </label>
            <InputText
              v-model="prop.name"
              placeholder="Property name"
              size="small"
              class="mt-1 w-full"
            />
          </div>
          <div>
            <label
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Value
            </label>
            <InputText
              v-model="prop.value"
              placeholder="Property value"
              size="small"
              class="mt-1 w-full"
            />
          </div>
          <div>
            <label
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Class
            </label>
            <InputText
              v-model="prop.class"
              placeholder="Optional class"
              size="small"
              class="mt-1 w-full"
            />
          </div>
          <div>
            <label
              class="text-xs uppercase tracking-wide text-gray-500 dark:text-slate-400"
            >
              Remarks
            </label>
            <InputText
              v-model="prop.remarks"
              placeholder="Optional remarks"
              size="small"
              class="mt-1 w-full"
            />
          </div>
        </div>
        <TertiaryButton
          type="button"
          class="!px-1"
          :aria-label="`Remove property ${index + 1}`"
          @click="remove(index)"
        >
          <BIconX />
        </TertiaryButton>
      </div>
    </div>

    <p v-if="!model.length" class="text-sm text-gray-600 dark:text-slate-400">
      No properties added.
    </p>

    <SecondaryButton size="small" type="button" @click="add">
      Add Property
    </SecondaryButton>
  </div>
</template>

<script setup lang="ts">
import type { Property } from '@/oscal';
import InputText from '@/volt/InputText.vue';
import SecondaryButton from '@/volt/SecondaryButton.vue';
import TertiaryButton from '@/volt/TertiaryButton.vue';
import { BIconX } from 'bootstrap-icons-vue';

const model = defineModel<Property[]>({ required: true });

function add() {
  model.value = [...model.value, { name: '', value: '' }];
}

function remove(index: number) {
  model.value = model.value.filter((_, i) => i !== index);
}
</script>
