<template>
  <div
    ref="dropdownRef"
    class="relative inline-block w-full"
    @mousedown.capture="handlePointerDownInside"
    @focusout="handleFocusOut"
    @keydown="handleKeydown"
  >
    <button
      ref="buttonRef"
      :id="id"
      type="button"
      @click="toggleDropdown"
      :disabled="disabled"
      class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:cursor-not-allowed disabled:opacity-60 text-left flex items-center justify-between"
      :aria-labelledby="resolvedAriaLabelledby"
      :aria-label="ariaLabel"
      aria-haspopup="true"
      :aria-expanded="isOpen"
    >
      <span class="truncate">
        {{ displayText }}
      </span>
      <svg
        class="w-4 h-4 transition-transform flex-shrink-0 ml-2"
        :class="{ 'rotate-180': isOpen }"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M19 14l-7 7m0 0l-7-7m7 7V3"
        ></path>
      </svg>
    </button>

    <div
      v-show="isOpen"
      @mousedown.prevent
      class="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg z-10"
    >
      <div class="p-2 space-y-2">
        <label
          v-for="option in options"
          :key="option.value"
          class="flex items-center px-3 py-2 rounded"
          :class="
            option.disabled || disabled
              ? 'cursor-not-allowed opacity-60'
              : 'cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-600'
          "
          v-tooltip.top="option.disabled ? option.disabledTooltip : undefined"
        >
          <input
            type="checkbox"
            :value="option.value"
            :checked="(props.modelValue || []).includes(option.value)"
            @change="toggleOption(option.value)"
            :disabled="disabled || option.disabled"
            class="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-60"
          />
          <span class="ml-2 text-sm text-gray-900 dark:text-gray-100">{{
            option.label
          }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts" generic="T extends string">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import Tooltip from 'primevue/tooltip';

defineOptions({
  directives: {
    tooltip: Tooltip,
  },
});

const props = withDefaults(
  defineProps<{
    options: Array<{
      label: string;
      value: T;
      disabled?: boolean;
      disabledTooltip?: string;
    }>;
    modelValue?: T[];
    disabled?: boolean;
    placeholder?: string;
    id?: string;
    ariaLabelledby?: string;
    ariaLabel?: string;
  }>(),
  {
    disabled: false,
    placeholder: 'Select options',
  },
);

const emit = defineEmits<{
  'update:modelValue': [value: T[]];
}>();

const isOpen = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);
const buttonRef = ref<HTMLButtonElement | null>(null);
let internalPointerInteractionTimeoutId: number | null = null;
const isHandlingInternalPointerInteraction = ref(false);
const resolvedAriaLabelledby = computed(
  () => props.ariaLabelledby || undefined,
);

const toggleDropdown = () => {
  if (!props.disabled) {
    isOpen.value = !isOpen.value;
  }
};

const closeDropdown = () => {
  isOpen.value = false;
};

const handleClickOutside = (event: MouseEvent) => {
  if (
    dropdownRef.value &&
    event.target instanceof Node &&
    !dropdownRef.value.contains(event.target)
  ) {
    closeDropdown();
  }
};

const handleFocusOut = (event: FocusEvent) => {
  if (isHandlingInternalPointerInteraction.value) {
    return;
  }

  if (!(event.relatedTarget instanceof Node)) {
    return;
  }

  if (dropdownRef.value && dropdownRef.value.contains(event.relatedTarget)) {
    return;
  }

  closeDropdown();
};

const handlePointerDownInside = () => {
  isHandlingInternalPointerInteraction.value = true;

  if (internalPointerInteractionTimeoutId) {
    clearTimeout(internalPointerInteractionTimeoutId);
  }

  internalPointerInteractionTimeoutId = window.setTimeout(() => {
    isHandlingInternalPointerInteraction.value = false;
    internalPointerInteractionTimeoutId = null;
  }, 0);
};

const handleKeydown = (event: KeyboardEvent) => {
  if (!isOpen.value || event.key !== 'Escape') {
    return;
  }

  event.preventDefault();
  event.stopPropagation();
  closeDropdown();
  buttonRef.value?.focus();
};

const toggleOption = (value: T) => {
  const option = props.options.find((candidate) => candidate.value === value);
  if (props.disabled || option?.disabled) {
    return;
  }

  const newValue = [...(props.modelValue || [])];
  const index = newValue.indexOf(value);

  if (index > -1) {
    newValue.splice(index, 1);
  } else {
    newValue.push(value);
  }

  emit('update:modelValue', newValue);
};

const displayText = computed(() => {
  const value = props.modelValue || [];
  if (value.length === 0) {
    return props.placeholder;
  }

  return value
    .map((val) => {
      const option = props.options.find((opt) => opt.value === val);
      return option ? option.label : val;
    })
    .join(', ');
});

onMounted(() => {
  document.addEventListener('mousedown', handleClickOutside);
});

onUnmounted(() => {
  if (internalPointerInteractionTimeoutId) {
    clearTimeout(internalPointerInteractionTimeoutId);
  }
  document.removeEventListener('mousedown', handleClickOutside);
});
</script>
