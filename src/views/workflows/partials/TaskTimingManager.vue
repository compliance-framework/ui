<template>
  <div class="mb-6">
    <label class="inline-block pb-2 dark:text-slate-300">Task Timing</label>
    <div
      class="p-3 border border-ccf-300 dark:border-slate-700 rounded-md bg-gray-50 dark:bg-slate-800"
    >
      <!-- Timing Type Selection -->
      <div class="mb-4">
        <label class="inline-block pb-1 text-sm dark:text-slate-300"
          >Timing Type</label
        >
        <select
          v-model="selectedTimingType"
          @change="updateTimingType"
          class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
        >
          <option value="">Select timing type</option>
          <option value="onDate">On Specific Date</option>
          <option value="withinDateRange">Within Date Range</option>
          <option value="atFrequency">At Frequency</option>
        </select>
      </div>

      <!-- On Date -->
      <div v-if="selectedTimingType === 'onDate'" class="space-y-3">
        <div>
          <label class="inline-block pb-1 text-sm dark:text-slate-300"
            >Date</label
          >
          <FormInput
            v-model="onDateValue"
            @input="updateOnDate"
            type="date"
            placeholder="Select date"
          />
        </div>
      </div>

      <!-- Within Date Range -->
      <div v-if="selectedTimingType === 'withinDateRange'" class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300"
              >Start Date</label
            >
            <FormInput
              v-model="dateRangeStart"
              @input="updateDateRange"
              type="date"
              placeholder="Start date"
            />
          </div>
          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300"
              >End Date</label
            >
            <FormInput
              v-model="dateRangeEnd"
              @input="updateDateRange"
              type="date"
              placeholder="End date"
            />
          </div>
        </div>
      </div>

      <!-- At Frequency -->
      <div v-if="selectedTimingType === 'atFrequency'" class="space-y-3">
        <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300"
              >Period</label
            >
            <FormInput
              v-model="frequencyPeriod"
              @input="updateFrequency"
              type="number"
              min="1"
              placeholder="e.g., 1, 2, 3"
            />
          </div>
          <div>
            <label class="inline-block pb-1 text-sm dark:text-slate-300"
              >Unit</label
            >
            <select
              v-model="frequencyUnit"
              @change="updateFrequency"
              class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100"
            >
              <option value="">Select unit</option>
              <option value="days">Days</option>
              <option value="weeks">Weeks</option>
              <option value="months">Months</option>
              <option value="years">Years</option>
            </select>
          </div>
        </div>
      </div>

      <!-- Clear Timing -->
      <div class="mt-4">
        <button
          type="button"
          @click="clearTiming"
          class="px-3 py-1 bg-red-500 text-white text-sm rounded-md hover:bg-red-600 transition-colors"
        >
          Clear Timing
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import FormInput from '@/components/forms/FormInput.vue';
import type { TaskTiming } from '@/stores/assessment-plans.ts';

const props = defineProps<{
  modelValue?: TaskTiming;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: TaskTiming | undefined];
}>();

const timing = computed({
  get: () => props.modelValue || {},
  set: (value: TaskTiming) => emit('update:modelValue', value),
});

// Track which timing type is selected
const selectedTimingType = ref<string>('');

// Individual field refs for easier management
const onDateValue = ref<string>('');
const dateRangeStart = ref<string>('');
const dateRangeEnd = ref<string>('');
const frequencyPeriod = ref<string>('');
const frequencyUnit = ref<string>('');

// Initialize timing type and fields when timing changes
watch(
  timing,
  (newTiming) => {
    if (newTiming.hasOwnProperty('onDate')) {
      selectedTimingType.value = 'onDate';
      onDateValue.value = newTiming.onDate || '';
    } else if (newTiming.withinDateRange) {
      selectedTimingType.value = 'withinDateRange';
      dateRangeStart.value = newTiming.withinDateRange.start || '';
      dateRangeEnd.value = newTiming.withinDateRange.end || '';
    } else if (newTiming.atFrequency) {
      selectedTimingType.value = 'atFrequency';
      frequencyPeriod.value = newTiming.atFrequency.period || '';
      frequencyUnit.value = newTiming.atFrequency.unit || '';
    } else {
      selectedTimingType.value = '';
    }
  },
  { immediate: true },
);

const updateTimingType = () => {
  const newTiming: TaskTiming = {};

  if (selectedTimingType.value === 'onDate') {
    newTiming.onDate = '';
    onDateValue.value = '';
  } else if (selectedTimingType.value === 'withinDateRange') {
    newTiming.withinDateRange = { start: '', end: '' };
    dateRangeStart.value = '';
    dateRangeEnd.value = '';
  } else if (selectedTimingType.value === 'atFrequency') {
    newTiming.atFrequency = { period: '', unit: '' };
    frequencyPeriod.value = '';
    frequencyUnit.value = '';
  }

  timing.value = newTiming;
};

const updateOnDate = () => {
  timing.value = {
    ...timing.value,
    onDate: onDateValue.value,
  };
};

const updateDateRange = () => {
  if (timing.value.withinDateRange) {
    timing.value = {
      ...timing.value,
      withinDateRange: {
        start: dateRangeStart.value,
        end: dateRangeEnd.value,
      },
    };
  }
};

const updateFrequency = () => {
  if (timing.value.atFrequency) {
    timing.value = {
      ...timing.value,
      atFrequency: {
        period: frequencyPeriod.value,
        unit: frequencyUnit.value,
      },
    };
  }
};

const clearTiming = () => {
  selectedTimingType.value = '';
  onDateValue.value = '';
  dateRangeStart.value = '';
  dateRangeEnd.value = '';
  frequencyPeriod.value = '';
  frequencyUnit.value = '';
  emit('update:modelValue', undefined);
};
</script>
