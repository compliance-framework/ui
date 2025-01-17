<template>
  <teleport to="body">
    <div
      class="relative z-10"
      :aria-labelledby="props.title"
      role="dialog"
      aria-modal="true"
      v-if="show"
    >
      <div
        class="fixed inset-0 bg-gray-500/75 transition-opacity"
        aria-hidden="true"
      ></div>

      <div class="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div
          class="flex min-h-full items-end justify-center p-4 text-center sm:items-center sm:p-0"
        >
          <div
            class="relative transform overflow-hidden rounded-lg bg-white text-left shadow-xl transition-all sm:my-8 sm:max-w-3xl"
          >
            <div class="bg-white px-4 pb-4 pt-5 sm:p-6 sm:pb-4">
              <div class="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left">
                <slot></slot>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </teleport>
</template>

<script setup lang="ts">
const props = defineProps(['title']);
const show = defineModel('show', {
  required: true,
  default: false,
});
</script>
